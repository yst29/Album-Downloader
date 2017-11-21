const utility = require(global.__base+'utility.js');
const BaseModule = require('./baseModule.js').BaseModule;

function PChome(id, url) {
    BaseModule.apply(this, arguments);
    this.parse_menupage = parse_menupage_pchome;
    this.start_single_download = start_single_download_pchome;
}

function parse_menupage_pchome(only_get_info){
    let item = this;
    var image_link_arr_RTN=[];
    return new Promise(function(resolve, reject){
        utility.get_html(item.url).then(function(html){
            var parser = new DOMParser()
            var doc = parser.parseFromString(html, "text/html");
            var title =  doc.querySelector(".dis > div:nth-child(1) > a:nth-child(1)").innerHTML;
            var image_total = doc.querySelector("#ainfo > div.dis > div.tit > span").innerHTML;
            image_total = image_total.slice(1,image_total.length-1);
            if(!only_get_info){
                pages = Math.ceil(image_total/25);
                var merged_obj={};
                var promise_arr=[];
                var url_remove_tail_slash = item.url.replace(/\/*$/,'');
                for(var i=0; i<pages; i++){
                    if(i==0){
                        var link_arr  = parse_image_links(html);
                        merged_obj = {0: link_arr};
                    } else {
                        var promise = parse_menupage_afterP2(url_remove_tail_slash+'*'+(i+1), i).then(function(rtn_obj){
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
        });
    });
}

function parse_menupage_afterP2(url, index){
    return new Promise(function(resolve, reject){
        var rtn_obj = {};
        console.log(url, index);
        utility.get_html(url).then(function(html){
            var image_link_arr = parse_image_links(html);
            rtn_obj[index]=image_link_arr;
            resolve(rtn_obj);
        });
    });
}

function parse_image_links(html){
    var image_link_arr = utility.regex_findall(/id="pic" class="MarkSet"><a href="(\S+?)"><span/g, html);
    image_link_arr = image_link_arr.map(function(x) { return 'http://photo.pchome.com.tw' + x; });
    return image_link_arr;
}

function parse_eh_image_url(html){
    return new Promise(function(resolve, reject){
        var doc = new DOMParser().parseFromString(html, "text/html");
        var image_url = doc.getElementById('PhotoAreaEns').getAttribute('src');
        if(!image_url){
            reject(new Error('album parse error'));
        } else{
            resolve('http://photo.pchome.com.tw' + image_url);
        }
    });
}

function start_single_download_pchome(){
    let dl_obj = this;
    return new Promise(function(resolve, reject){
        utility.get_html(dl_obj.link).then(function(html){
            parse_eh_image_url(html).then(function(image_url){
                var fname = dl_obj.fname + '.' + image_url.split('.').pop();
                utility.download_file(image_url, dl_obj.dir, fname, dl_obj.link).then(function(){
                    resolve();
                }).catch(function(err){
                    reject(err);
                });
            }).catch(function(err){
                reject(err);
            });
        }).catch(function(err){
            reject(err);
        });
    });
}

module.exports = {
    PChome : PChome
}