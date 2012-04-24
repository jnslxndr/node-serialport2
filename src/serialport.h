
#ifndef _serialport_h_
#define _serialport_h_

#include <node.h>
#include <v8.h>
#include <node_buffer.h>

v8::Handle<v8::Value> Open(const v8::Arguments& args);
void EIO_Open(uv_work_t* req);
void EIO_AfterOpen(uv_work_t* req);
v8::Handle<v8::Value> Write(const v8::Arguments& args);
void EIO_Write(uv_work_t* req);
void EIO_AfterWrite(uv_work_t* req);
v8::Handle<v8::Value> Close(const v8::Arguments& args);
void AfterOpenSuccess(int fd, v8::Handle<v8::Value> dataCallback, v8::Handle<v8::Value> errorCallback);

struct OpenBaton {
public:
  char path[1024];
  v8::Persistent<v8::Value> callback;
  v8::Persistent<v8::Value> dataCallback;
  v8::Persistent<v8::Value> errorCallback;
  int result;
  int baudRate;
  char errorString[1024];
};

struct WriteBaton {
public:
  int fd;
  char* bufferData;
  size_t bufferLength;
  v8::Persistent<v8::Object> buffer;
  v8::Persistent<v8::Value> callback;
  int result;
  char errorString[1024];
};

#endif
