const utility = require(global.__base+'utility.js');
const BaseModule = require('./baseModule.js').BaseModule;

function Pixnet(id, url) {
    BaseModule.apply(this, arguments);
    this.parse_menupage = parse_menupage_pixnet;
    this.start_single_download = start_single_download_pixnet;
}

function parse_menupage_pixnet(only_get_info){
    let item = this;
    return new Promise(function(resolve, reject){
        utility.get_html(item.url).then(function(html){
            var document = new DOMParser().parseFromString(html, "text/html");
            var title =  document.querySelector("title").innerHTML.split(' @')[0];
            var image_total = '?';
            item.test = 'ker';
            if(!only_get_info){
                let image_link_arr = parse_image_links(html);
                let lastImageId = utility.regex_findone(/pix\.f\.alb2\.thumbbarParams\.last_id = (\d{1,10});/,html);
                parse_menupage_afterP2(item.url, lastImageId, image_link_arr).then(function(image_link_arr){
                    image_total = image_link_arr.length;
                    resolve([title,image_total,image_link_arr]);
                })
            } else {
                resolve([ title,image_total,[] ]);
            }
        }).catch(function(err){
            reject(err);
        })
    });
}

function parse_menupage_afterP2(baseUrl, lastImageId, image_link_arr){
    return new Promise(function(resolve, reject){
        let lastImage = image_link_arr[image_link_arr.length -1].split('/').pop();
        if(lastImage.endsWith(lastImageId)){
            resolve([image_link_arr, true]);
        } else{
            utility.get_html(baseUrl+'?after='+lastImage).then(function(html){
                let image_link_arr2 = parse_image_links(html);
                image_link_arr = image_link_arr.concat(image_link_arr2);
                resolve([image_link_arr, false]);
            }).catch(function(err){
                reject(err);
            })
        }
    }).then(function([image_link_arr, isEnd]){
        if(isEnd){
            return image_link_arr;
        } else{
            return parse_menupage_afterP2(baseUrl, lastId, image_link_arr);
        }
    });
}

function parse_image_links(html){
    let document = new DOMParser().parseFromString(html, "text/html");
    let image_link_arr = Array.from(document.querySelectorAll('.photo-grid'));
    if(image_link_arr.length==0){
        return false;
    } else{
        image_link_arr = image_link_arr.map(function(x){
            return x.childNodes[0].getAttribute('href').split('#')[0];
        });
        return image_link_arr;
    }
}

function parse_image_url(html){
    let document = new DOMParser().parseFromString(html, "text/html");
    let element = document.getElementById('item-frame-img');
    if(element){
        return element.getAttribute('src');
    }
    return false;
}

function start_single_download_pixnet(){
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
    Pixnet : Pixnet
}