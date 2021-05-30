export default function httpAdapter(
  requestType,
  url,
  body,
  headers,
  maxRedirects
) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      host: parsedUrl.host,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: requestType,
      headers,
      maxRedirects,
    };
    const req = this.nodeAdapters[parsedUrl.protocol.slice(0, -1)].request(
      options,
      (res) => {
        const response = {
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          arrayBuffer: [],
          get text() {
            const result = this.arrayBuffer.toString("utf-8");
            delete this.text;
            return (this.text = result);
          },
          get json() {
            const result = JSON.parse(this.text);
            delete this.json;
            return (this.json = result);
          },
          get blob() {
            if (Blob === undefined) {
              throw new Error("Please include Blob polyfill for Node.js");
            }
            const contentType = this.headers["content-type"] || "";
            const result = new Blob([new Uint8Array(this.arrayBuffer)], {
              type: contentType.split(";")[0].trim(),
            });
            delete this.blob;
            return (this.blob = result);
          },
        };
        res.on("data", (chunk) => response.arrayBuffer.push(chunk));
        res.on("end", () => {
          response.arrayBuffer = Buffer.concat(response.arrayBuffer);
          if (res.statusCode >= 200 && res.statusCode < 400) {
            resolve(response);
          } else {
            reject(
              new NetworkError(
                `${res.statusCode} ${res.statusMessage}`,
                req,
                response
              )
            );
          }
        });
      }
    );
    req.on("error", (e) => reject(new NetworkError(e.message, req)));
    body && req.write(body);
    req.end();
  });
}
