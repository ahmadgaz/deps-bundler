const getContentTypeHeader = (type: string): string => {
    return type === "application/javascript" ? type + "; charset=utf-8" : type;
};

export default getContentTypeHeader;
