const path = require('path');
const fs = require('fs');
const request = require('request');
const iconv = require('iconv-lite');

function download_file(target_url, dir, fname , referer){
    console.log(target_url);
    return new Promise(function(resolve, reject){
        var options = {
            url: target_url,
            timeout: 60*1000,
            headers: {
                "Referer": referer
            }
          };
          var filepath = path.join(dir,fname);
          var tfs = fs.createWriteStream(filepath);
          request.get(options , function (err, response, body) { 
            if(err){
                reject(err);
            } else if(response.statusCode !== 200){
                reject(new Error('statusCode is not 200'));
            }
         }).pipe(tfs);

          tfs.on('finish', function(){
            resolve();
          });
          tfs.on('error', function (err) {
            reject(err);
          });
    });
}

function get_html(target_url){
    return new Promise(function(resolve, reject){
        request.get({
            url: target_url,
            timeout: 60*1000,
            encoding: null
         }, function (err, response, body) { 
            if(err){
                reject(err);
            } else if(response.statusCode !== 200){
                reject(new Error('statusCode is not 200'));
            } else {
                let charset = regex_findone(/(?:charset|encoding)\s{0,10}=\s{0,10}['"]? {0,10}([\w\-]{1,100})/,body)
                if(charset && charset.toUpperCase()=='BIG5'){
                    body = iconv.decode(body, 'BIG5');
                }
                resolve(body);
            }
         })
    });
}

function regex_findone(regexp, string){
    let match = regexp.exec(string);
    if(match){
        return match[1];
    } else{
        return null;
    }
}

function regex_findall(regexp, string){
    let matches = [];
    if(regexp.flags.indexOf('g') == -1){
        regexp = new RegExp(regexp.source, 'g');
    }

    let match = null;
    while (match = regexp.exec(string)) {
        matches.push(match[1]);
    }
    return matches;
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

module.exports = {
    download_file : download_file,
    get_html : get_html,
    regex_findone : regex_findone,
    regex_findall : regex_findall,
    uuidv4 : uuidv4
}