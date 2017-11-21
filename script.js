const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const queue = require('queue')
const utility = require('./utility.js');

//download modules
global.__base = path.resolve() + '/';
const DlLink = require('./download_modules/baseModule.js').DlLink;
const PChome = require('./download_modules/pchome.js').PChome;
const Xuite = require('./download_modules/xuite.js').Xuite;
const Pixnet = require('./download_modules/pixnet.js').Pixnet;

let root_dir='C:\\Users\\user\\Desktop\\temp';
let item_arr=[];
let global_id=0;

window.onload = function(){
    document.getElementById("targetDir").value = root_dir;
}

function do_add(){
    let ready_to_add = parse_inputs();
    if(ready_to_add){
        add_items(ready_to_add);
    }
    return;
}

function parse_inputs(){
    let pure_input = document.getElementById('inputUrls').value.trim();
    if(pure_input!=''){
        let rtn = pure_input.split('\n');
        rtn = rtn.filter(function(input){
            return input.trim() != '';
        });
        return rtn;
    }
    return false;
}

function new_download_modules(id, url){
    if(url.indexOf('pchome') !== -1){
        return new PChome(id, url);
    } else if(url.indexOf('xuite') !== -1){
        return new Xuite(id, url);
    } else if(url.indexOf('pixnet') !== -1){
        return new Pixnet(id, url);
    } else{
        return null;
    }
}

function add_items(inputs) {
    let input_id_arr=[];
    for(let i=0; i<inputs.length; i++){
        const item = new_download_modules(global_id, inputs[i]);
        if(item){
            item_arr.push(item);
            input_id_arr.push(item.id);
            add_result_base(item);
            global_id++;
        }
    }
    set_item_info().then(function(){
        do_item_queue(input_id_arr);
    });
}

function set_item_info() {
    return new Promise(function(resolve, reject){
        let promise_arr=[];
        for(let i=0; i<item_arr.length; i++){
            let item = item_arr[i];
            if(item.title==''){
                let p = item.parse_menupage(true).then(function(data_arr){
                    item.title = data_arr[0];
                    item.total = data_arr[1];
                    set_result(item);
                }).catch(function(err){
                    console.error(err);
                });
                promise_arr.push(p);
            }
        }
        Promise.all(promise_arr).then(function(){
            for(let i=0; i<item_arr.length; i++){
                let item = item_arr[i];
                if(item.title==''){
                    item.title = 'ERROR!'
                    item.total = 0;
                    item.done = true;
                    set_result(item);
                    set_error(i);
                }
            }
            resolve();
        });
    });
}

function start_item(item){
    return new Promise(function(resolve, reject){
        if(item.title==''){
            return resolve();
        }
        item.parse_menupage(false).then(function(data_arr){
            console.log(data_arr);
            let title = data_arr[0];
            let image_total = data_arr[1];
            let image_link_arr = data_arr[2];
            item.dir = path.join(root_dir, add_time_prifix(title.replace(/[\/\/:\*\?"<>\|]/g, ' ')));

            if(item.total == '?'){
                item.total = image_total;
                set_result(item);
            }

            fs.access(item.dir, function(err){
                if(err) {
                    fs.mkdir(item.dir, function(err){
                        if(err){
                            reject(err);
                        } else{
                            for(let i=0; i<image_link_arr.length; i++){
                                let linkObj = {link: image_link_arr[i], fname: pad_zero(i+1,3)};
                                item.links.push(linkObj);
                            }
                            do_dl_queue(item).then(function(){
                                resolve();
                            });
                        }
                    });
                } else{
                    reject(new Error('Directory existed'));
                }
            });
        }).catch(function(err){
            reject(err);
        })
    });
}

function do_dl_queue(item){
    return new Promise(function(resolve, reject){
        let dl_queue = queue();
        dl_queue.concurrency=8;
        dl_queue.timeout = 30*1000;
        if(item.total == 1){
            dl_queue.timeout = 3600*1000;
        }
        let finish_count=0;
        let retry_jobs=[];
        let retry_count=0;

        for(let i = 0; i < item.links.length; i++) {
            const dl_obj = new DlLink(item, i);
            const job = function(cb){
                const obj = dl_obj;
                obj.start_single_download().then(function(){
                    cb(); 
                }).catch(function(err){
                    cb(err);
                });
            }
            job.attr = dl_obj;
            dl_queue.push(job);
        }
        dl_queue.start();
        set_item_active(item.id, true);

        dl_queue.on('success', function (result, job) {
            finish_count++;
            set_progress(item, finish_count);
        })
        dl_queue.on('error', function (err, job) {
            console.error(item['title'], job.attr['fname'], err);
            retry_jobs.push(job);
        })
        dl_queue.on('timeout', function (next, job) {
            console.error(item['title'], job.attr['fname'], 'TIMEOUT');
            retry_jobs.push(job);
            next();
        })
        dl_queue.on('end', function (err) {
            if(retry_jobs.length>0 && retry_count<5){
                console.log('retry');
                for(let i=0; i<retry_jobs.length ;i++){
                    dl_queue.push(retry_jobs[i]);
                }
                retry_jobs.length=0;
                retry_count++;
                dl_queue.start();
            } else{
                console.log('finish_count: '+finish_count);
                if(retry_jobs.length>0){
                    set_incomplete(item.id);
                } else{
                    set_finish(item.id);
                }
                set_item_active(item.id, false);
                resolve();
            }
        })
    });
}

let item_queue_running = false;
let item_queue = queue();
item_queue.concurrency=1;

function do_item_queue(input_id_arr){
    for(let i = 0; i < input_id_arr.length; i++) {
        const id = input_id_arr[i];
        if(!item_arr[id].title!=='' && item_arr[id].done==false){
            const job = function(cb){
                const obj = item_arr[id];
                start_item(obj).then(function(){
                    cb();
                }).catch(function(err){
                    cb(err);
                });
            }
            job.attr = item_arr[id];
            item_queue.push(job);
        }
    }
    if(!item_queue_running && item_queue.length>0) {
        item_queue.start();
        item_queue_running = true;

        item_queue.on('success', function (result, job) {
            console.log(job.attr['title'],'success...');
            item_arr[job.attr['id']].done = true;
        })
        item_queue.on('error', function (err, job) {
            console.error(job.attr);
            console.error(err);
            set_error(job.attr['id']);
        })
        item_queue.on('end', function (err) {
            item_queue_running = false;
            if(item_queue.length>0){
                item_queue.start();
            }
        })
    }
}

function add_time_prifix(str){
    let currentdate = new Date();
    let datetime = ''+pad_zero((currentdate.getMonth()+1),2)+
                    pad_zero(currentdate.getDate(),2)+
                    pad_zero(currentdate.getHours(),2)+
                    pad_zero(currentdate.getMinutes(),2)+
                    pad_zero(currentdate.getSeconds(),2);
    return datetime+'_'+str;
}

function pad_zero(integer,width){
    rtn = ('0'.repeat(width) + integer.toString()).slice(-(width));
    return rtn;
}

function changeRootDir(){
    let targetDir = document.getElementById('targetDir').value;
    let changeDirMsg = document.getElementById('changeDirMsg');
    if(fs.existsSync(targetDir)){
        if(fs.lstatSync(targetDir).isDirectory()){
            showChangeDirMsg('Change success', 'blue');
            root_dir = targetDir;
        } else {
            showChangeDirMsg('This path isn\'t a directory', 'red');
        }
    } else{
        showChangeDirMsg('Directory not found', 'red');
    }
}

function showChangeDirMsg(text, color){
    if(showChangeDirMsg.timeoutHandle){
        clearTimeout(showChangeDirMsg.timeoutHandle);
    }
    $("#changeDirMsg").css("display", 'none');
    $("#changeDirMsg").html(text);
    $("#changeDirMsg").css("color", color);
    $("#changeDirMsg").fadeIn("slow");
    showChangeDirMsg.timeoutHandle = setTimeout(function() { $("#changeDirMsg").fadeOut("fast"); }, 5000);
}

function test() {
    
}

function add_result_base(item){
    let num = document.getElementById("result_table").rows.length;
    let tr = document.getElementById("result_table").insertRow(num);
    tr.setAttribute("id", 'item_'+item.id);
    td = tr.insertCell(tr.cells.length);
    td.innerHTML = 'Loading...';
    td = tr.insertCell(tr.cells.length);
    td.innerHTML = progress_bar(0, 'Loading...');
    td = tr.insertCell(tr.cells.length);
    td.innerHTML = item.url;
}

function set_result(item){
    let tds = document.getElementById('item_'+item.id).childNodes;
    tds[0].innerHTML = item.title;
    set_progress(item, '0');
}

function set_progress(item, count){
    let td = document.getElementById('item_'+item.id).childNodes[1];
    td.innerHTML = progress_bar(count*100/item.total, count+' / '+item.total);
}

function set_finish(id){
    let span = document.getElementById('item_'+id).childNodes[1].childNodes[0].childNodes[0].childNodes[0];
    span.innerHTML += ' (Done)';
    set_progress_bar_color(id, '#66ff66');
}

function set_error(id){
    set_progress_text(id, 'Error');
    set_progress_bar_color(id, '#ff3300');
}

function set_incomplete(id){
    let span = document.getElementById('item_'+id).childNodes[1].childNodes[0].childNodes[0].childNodes[0];
    span.innerHTML += ' (Incomplete)';
    set_progress_bar_color(id, '#ffad33');
}

function set_progress_text(id, text){
    let td = document.getElementById('item_'+id).childNodes[1];
    td.innerHTML = progress_bar(0, text);
}

function set_progress_bar_color(id, colorCode){
    let tr = document.getElementById('item_'+id);
    let progress = tr.childNodes[1].childNodes[0];
    let progressBar = progress.childNodes[0];
    progress.style.cssText = progressBar.style.cssText = 'background-color: '+colorCode+'; background-image: none;';
    //progress.style.backgroundImage = progressBar.style.backgroundImage = null;
    //progress.style.backgroundColor = progressBar.style.backgroundColor = colorCode;
}

function progress_bar(percent,content){
    return '<div class="progress"><div class="progress-bar progress-bar-info" style="width: '+percent+'%;"><span><strong>'+content+'</strong></span></div></div>'
    //return '<div class="progress" data-label="'+content+'"><span class="value" style="width:'+percent+'%;"></span></div>';
}

function set_item_active(id,isActive){
    let td = document.getElementById('item_'+id).childNodes[0];
    if(isActive){
        td.style.color = "blue";
    } else{
        td.style.color = null;
    }
}