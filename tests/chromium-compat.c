#define _GNU_SOURCE
#include <unistd.h>
#include <dlfcn.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
extern char *program_invocation_name;
/* The test container has no /proc. Supply only this process's known,
 * workspace-owned executable path; preserve every other readlink result. */
ssize_t readlink(const char *path, char *buf, size_t size) {
  static ssize_t (*real_readlink)(const char*,char*,size_t);
  if (!real_readlink) real_readlink=dlsym(RTLD_NEXT,"readlink");
  if (!strcmp(path,"/proc/self/exe")) {
    const char *known=getenv("TP_BROWSER_EXE");
    if (known && !strcmp(program_invocation_name, known)) {
      size_t n=strlen(known);if(n>size)n=size;
      memcpy(buf,known,n);return n;
    }
  }
  return real_readlink(path,buf,size);
}
