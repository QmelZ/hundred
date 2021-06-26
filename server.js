const http = require("http");
const fs = require("fs");
const path = require("path");

const config = {
    mimeTypes: [".html", "text/html", ".css", "text/css", ".js", "text/javascript", ".txt", "text/plain"],
    cacheTime: 2,
    cacheAmount: 2,
    port: 3000
};

class Cache extends Map{
    constructor(cacheTime, cacheAmount){
        super();
        this.lastAccessed = [];
        this.cacheTime = cacheTime;
        this.cacheAmount = cacheAmount;
    }
    
    set(key, value){
        this.accessed(key);
        const int = setInterval(() => {
            if(this.lastAccessed.includes(key)) return;
            super.delete(key);
            clearInterval(int);
        }, this.cacheTime * 60 * 1e3);
        return super.set(key, value);
    }
    
    setUncached(key, value){
        return super.set(key, value);
    }
    
    get(key){
        this.accessed(key);
        return super.get(key);
    }
    
    has(key){
        this.accessed(key);
        return super.has(key);
    }
    
    accessed(key){
        this.lastAccessed.push(key);
        if(this.lastAccessed.length > this.cacheAmount) this.lastAccessed.shift();
    }
}

const routes = new Cache(config.cacheTime, config.cacheAmount);
routes.setUncached("/.html", fs.readFileSync("./data/index.html"));

const mimeTypes = new Map();
for(let i = 0; i < config.mimeTypes, i += 2){
    mimeTypes.set(config.mimeTypes[i], config.mimeTypes[i + 1]);
}
function getMimeType(cleanPath){
    const ext = cleanPath === "/.html" ? ".html" : path.extname(cleanPath);
    if(!mimeTypes.has(ext)) return "application/octet-stream";
    return mimeTypes.get(ext);
}

function checkRoute(cleanPath){
    if(routes.has(cleanPath)) return true;
    
    const filePath = path.normalize(`./data/${cleanPath}`);
    if(fs.existsSync(filePath)){
        routes.set(cleanPath, fs.readFileSync(filePath));
        return true;
    }
    
    return false;
}

function listener(req, res){
    let cleanPath = path.normalize(req.url);
    if(!path.extname(cleanPath)) cleanPath += ".html";
    
    if(cleanPath === "/index.html"){
        res.writeHead(301, {
            "Location": "/"
        });
        res.end();
        return;
    }
    
    if(!checkRoute(cleanPath)){
        res.writeHead(404);
        res.end();
        return;
    }
    
    const mimeType = getMimeType(cleanPath);
    res.writeHead(200, {"Content-Type": mimeType})
    res.write(routes.get(cleanPath));
    res.end();
}

http.createServer(listener).listen(config.port);
