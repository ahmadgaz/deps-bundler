import http from "http";

export default function bufferStream(
    stream: http.IncomingMessage
): Promise<Buffer> {
    return new Promise(
        (accept: (buffer: Buffer) => void, reject: (err: Error) => void) => {
            const chunks: Buffer[] = [];

            stream
                .on("error", reject)
                .on("data", (chunk: Buffer) => chunks.push(chunk))
                .on("end", () => accept(Buffer.concat(chunks)));
        }
    );
}
