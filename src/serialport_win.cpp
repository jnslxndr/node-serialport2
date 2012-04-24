
#include "serialport.h"

#ifdef WIN32

void ErrorCodeToString(const char* prefix, int errorCode, char *errorStr) {
  switch(errorCode) {
  case ERROR_FILE_NOT_FOUND:
    sprintf(errorStr, "%s: File not found", prefix);
    break;
  case ERROR_INVALID_HANDLE:
    sprintf(errorStr, "%s: Invalid handle", prefix);
    break;
  default:
    sprintf(errorStr, "%s: Unknown error code %d", prefix, errorCode);
    break;
  }
}

/*static*/ void EIO_Open(uv_work_t* req) {
  OpenBaton* data = static_cast<OpenBaton*>(req->data);

  HANDLE file = CreateFile(
    data->path,
    GENERIC_READ | GENERIC_WRITE,
    0,
    NULL,
    OPEN_EXISTING,
    FILE_FLAG_OVERLAPPED,
    NULL);
  if (file == INVALID_HANDLE_VALUE) {
    char temp[100];
    sprintf(temp, "Opening %s", data->path);
    ErrorCodeToString(temp, GetLastError(), data->errorString);
    return;
  }

  DCB dcb = { 0 };
  dcb.DCBlength = sizeof(DCB);
  if(!BuildCommDCB("9600,n,8,1", &dcb)) {
    ErrorCodeToString("BuildCommDCB", GetLastError(), data->errorString);
    return;
  }

  dcb.fBinary = true;
  dcb.BaudRate = data->baudRate;

  if(!SetCommState(file, &dcb)) {
    ErrorCodeToString("SetCommState", GetLastError(), data->errorString);
    return;
  }

  // set the com port to return immediatly after a read
  COMMTIMEOUTS commTimeouts = {0};
  commTimeouts.ReadIntervalTimeout = MAXDWORD;
  commTimeouts.ReadTotalTimeoutMultiplier = MAXDWORD;
  commTimeouts.ReadTotalTimeoutConstant = 1000;
  commTimeouts.WriteTotalTimeoutConstant = 1000;
  commTimeouts.WriteTotalTimeoutMultiplier = 1000;
  if(!SetCommTimeouts(file, &commTimeouts)) {
    ErrorCodeToString("SetCommTimeouts", GetLastError(), data->errorString);
    return;
  }

  data->result = (int)file;
}

struct WatchPortBaton {
public:
  HANDLE fd;
  DWORD bytesRead;
  char buffer[100];
  char errorString[1000];
  v8::Persistent<v8::Value> dataCallback;
  v8::Persistent<v8::Value> errorCallback;
};

void EIO_WatchPort(uv_work_t* req) {
  WatchPortBaton* data = static_cast<WatchPortBaton*>(req->data);

  OVERLAPPED osRead = { 0 };
  osRead.hEvent = CreateEvent(NULL, TRUE, FALSE, NULL);
  while(true){
    if(!ReadFile(data->fd, data->buffer, 100, &data->bytesRead, &osRead) && GetLastError() != ERROR_IO_PENDING) {
      ErrorCodeToString("ReadFile", GetLastError(), data->errorString);
      return;
    }
    if(data->bytesRead > 0) {
      return;
    }
    if(WaitForSingleObject(osRead.hEvent, INFINITE) != WAIT_OBJECT_0) {
      ErrorCodeToString("Waiting for overlapped results", GetLastError(), data->errorString);
      return;
    }
    if(!GetOverlappedResult((HANDLE)data->fd, &osRead, &data->bytesRead, FALSE)) {
      ErrorCodeToString("getting overlapped results", GetLastError(), data->errorString);
      return;
    }
    if(data->bytesRead > 0) {
      return;
    }
  }
}

void EIO_AfterWatchPort(uv_work_t* req) {
  WatchPortBaton* data = static_cast<WatchPortBaton*>(req->data);
  if(data->bytesRead > 0) {
    v8::Handle<v8::Value> argv[1];
    argv[0] = node::Buffer::New(data->buffer, data->bytesRead)->handle_;
    v8::Function::Cast(*data->dataCallback)->Call(v8::Context::GetCurrent()->Global(), 1, argv);
  }
  AfterOpenSuccess((int)data->fd, data->dataCallback, data->errorCallback);
  data->dataCallback.Dispose();
  data->errorCallback.Dispose();
  delete data;
  delete req;
}

void AfterOpenSuccess(int fd, v8::Handle<v8::Value> dataCallback, v8::Handle<v8::Value> errorCallback) {
  WatchPortBaton* baton = new WatchPortBaton();
  baton->fd = (HANDLE)fd;
  baton->dataCallback = v8::Persistent<v8::Value>::New(dataCallback);
  baton->errorCallback = v8::Persistent<v8::Value>::New(errorCallback);

  uv_work_t* req = new uv_work_t();
  req->data = baton;
  uv_queue_work(uv_default_loop(), req, EIO_WatchPort, EIO_AfterWatchPort);
  //uv_unref(uv_default_loop());
}

/*static*/ void EIO_Write(uv_work_t* req) {
  WriteBaton* data = static_cast<WriteBaton*>(req->data);

  DWORD bytesWritten;
  OVERLAPPED osWriter = { 0 };
  osWriter.hEvent = CreateEvent(NULL, TRUE, FALSE, NULL);
  if(!WriteFile((HANDLE)data->fd, data->bufferData, data->bufferLength, &bytesWritten, &osWriter) && GetLastError() != ERROR_IO_PENDING) {
    ErrorCodeToString("Writing from COM port", GetLastError(), data->errorString);
    return;
  }
  if(WaitForSingleObject(osWriter.hEvent, INFINITE) != WAIT_OBJECT_0) {
    ErrorCodeToString("Waiting for overlapped results", GetLastError(), data->errorString);
    return;
  }
  if(!GetOverlappedResult((HANDLE)data->fd, &osWriter, &bytesWritten, FALSE)) {
    ErrorCodeToString("getting overlapped results", GetLastError(), data->errorString);
    return;
  }

  data->result = bytesWritten;

  CloseHandle(osWriter.hEvent);
}

#endif
