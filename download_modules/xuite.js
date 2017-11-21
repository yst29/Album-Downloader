const utility = require(global.__base+'utility.js');
const BaseModule = require('./baseModule.js').BaseModule;

function Xuite(id, url) {
    BaseModule.apply(this, arguments);
    this.parse_menupage = parse_menupage_xuite;
    this.start_single_download = start_single_download_xuite;
}

function parse_menupage_xuite(only_get_info){
    let item = this;
    var image_link_arr_RTN=[];
    return new Promise(function(resolve, reject){
        utility.get_html(item.url).then(function(html){
            var document = new DOMParser().parseFromString(html, "text/html");
            var title =  document.querySelector("#content > div.title > span.titlename > a:nth-child(2)").innerHTML;
            var image_total = document.querySelector("#content > div.title > span.titlename > span").innerHTML;
            image_total = image_total.slice(3, image_total.length-3);
            if(!only_get_info){
                pages = Math.ceil(image_total/21);
                var merged_obj={};
                var promise_arr=[];
                for(var i=0; i<pages; i++){
                    if(i==0){
                        var link_arr  = parse_image_links(html);
                        merged_obj = {0: link_arr};
                    } else {
                        var promise = parse_menupage_afterP2(item.url+'*'+(i+1), i).then(function(rtn_obj){
                            merged_obj = Object.assign(merged_obj, rtn_obj);
                            
                            return;
                        });
                        promise_arr.push(promise);
                    }
                }
                Promise.all(promise_arr).then(function(){
                    for(var i=0; i<pages; i++){
                        image_link_arr_RTN = image_link_arr_RTN.concat(merged_obj[i]);
                    }
                    resolve([title,image_total,image_link_arr_RTN]);
                });
            } else {
                resolve([title,image_total,image_link_arr_RTN]);
            }
        }).catch(function(err){
            reject(err);
        })
    });
}

function parse_menupage_afterP2(url, index){
    return new Promise(function(resolve, reject){
        var rtn_obj = {};
        utility.get_html(url).then(function(html){
            var image_link_arr = parse_image_links(html);
            rtn_obj[index]=image_link_arr;
            resolve(rtn_obj);
        }).catch(function(err){
            reject(err);
        })
    });
}

function parse_image_links(html){
    let document = new DOMParser().parseFromString(html, "text/html");
    let image_link_arr = Array.from(document.querySelectorAll('.list_area > div > a'));
    if(image_link_arr.length==0){
        return false;
    } else{
        image_link_arr = image_link_arr.map(function(x){
            return 'http:' + x.getAttribute('href');
        });
        return image_link_arr;
    }
}

function parse_image_url(html){
    let document = new DOMParser().parseFromString(html, "text/html");
    let element = document.querySelector('link');
    if(element){
        return element.getAttribute('href');
    }
    return false;
}

function start_single_download_xuite(){
    let dl_obj = this;
    return new Promise(function(resolve, reject){
        utility.get_html(dl_obj.link).then(function(html){
            let image_url = parse_image_url(html);
            if(image_url){
                var fname = dl_obj.fname + '.' + image_url.split('.').pop();
                utility.download_file(image_url, dl_obj.dir, fname, dl_obj.link).then(function(){
                    resolve();
                }).catch(function(err){
                    reject(err);
                });
            } else{
                reject(new Error('parse image page error'));
            }
        }).catch(function(err){
            reject(err);
        });
    });
}

module.exports = {
    Xuite : Xuite
}