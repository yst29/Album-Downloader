function BaseModule(id, url) {
    this.id = id;
    this.url = url;
    this.dir = '';
    this.title = '';
    this.total = '';
    this.links = [];
    this.done = false;
}

function DlLink(obj , index) {
    this.link = obj.links[index].link;
    this.fname = obj.links[index].fname;
    this.dir = obj.dir;
    this.start_single_download = obj.start_single_download;
}

module.exports = {
    BaseModule : BaseModule,
    DlLink : DlLink
}