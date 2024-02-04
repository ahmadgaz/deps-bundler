import { Stream } from "stream";

export default function bufferStream(stream: Stream): Promise<Buffer> {
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
