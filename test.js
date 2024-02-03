import https from "https";

function bufferStream(stream) {
    return new Promise((accept, reject) => {
        const chunks = [];

        stream
            .on("error", reject)
            .on("data", (chunk) => {
                console.log("chunk:", chunk.toString());
                chunks.push(chunk);
            })
            .on("end", () => accept(Buffer.concat(chunks)));
    });
}

const otherfunction = async () => {
    const res = await new Promise((accept, reject) => {
        https
            .get(
                {
                    agent: new https.Agent({ keepAlive: true }),
                    hostname: "registry.npmjs.org",
                    path: "/is-wds-asiflhr",
                    headers: { Accept: "application/json" },
                },
                accept
            )
            .on("error", reject);
    });
    const buf = await bufferStream(res);
    console.log("buf:", buf.toString());
    return res;
};

otherfunction();
