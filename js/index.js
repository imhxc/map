/*!
 * 大概逻辑:
 * 1. 定义一个设有地点名称的列表数组对象:mapList
 * 2. 调用高德地图api，构建地图、标注
 * 3. 左右联动，监听地图标注和左侧列表数据点击事件，执行下列事件
 *       a. 改变列表选中状态, changeListStyle()
 *       b. 改变标注选中状态, changeMarkerStyle()
 *       c. 标注上方显示该地点详细信息,调用第三方api获取.getMarkerInfo()
 *       d. 重新设置地图中心点，确保被选中地点处于视窗中心位置 setMapCenter()
 *       另外，地点名称列表点击事件与标注点击事件相同，故都将上列方法都放入middleLinkage()函数中，直接调用middleLinkage()
 * 4. 筛选功能，点击筛选，根据输入框文字，进行筛选左侧地点列表和右侧地图标注
 */

// 数据列表
const mapList = [
    {
        name: '梅溪湖公园',
        address: '长沙市岳麓区梅溪湖路',
        index: 0,
        lng: 112.896967,
        lat: 28.187102,
        img: 'http://store.is.autonavi.com/showpic/0a49b3ca633bd0b0e1aaaabc53f6e4f4?operate=merge&w=160&h=150&position=5'
    },
    {
        name: '西湖文化园',
        address: '岳麓区枫林一路与财院路交叉口东',
        index: 1,
        lng: 112.941499,
        lat: 28.206772,
        img: 'http://store.is.autonavi.com/showpic/387dc6555de2b1feaf447ab7c15ee278?operate=merge&w=160&h=150&position=5'
    },
    {
        name: '岳麓山国家重点风景名胜区',
        address: '长沙市岳麓区登高路58号',
        index: 2,
        lng: 112.937353,
        lat: 28.182849,
        img: 'http://store.is.autonavi.com/showpic/2f12b96c221eb2436905b40647b52013?operate=merge&w=160&h=150&position=5'
    },
    {
        name: '橘子洲景区',
        address: '长沙市岳麓区橘子洲头2号',
        index: 3,
        lng: 112.962112,
        lat: 28.187206,
        img: 'http://store.is.autonavi.com/showpic/c6409a2d5cdb0942137b5ea9de5ce647?operate=merge&w=160&h=150&position=5'
    },
    {
        name: '太平老街',
        address: '天心区五一大道与太平街交叉口',
        index: 4,
        lng: 112.97207,
        lat: 28.193519,
        img: 'http://store.is.autonavi.com/showpic/e890b7a3c987c4db171073f2154df869?operate=merge&w=160&h=150&position=5'
    },
    {
        name: '天心阁',
        address: '长沙市天心区天心路17号',
        index: 5,
        lng: 112.981344,
        lat: 28.183718,
        img: 'http://store.is.autonavi.com/showpic/cf14bab1003f8fec233d0886a300b699?operate=merge&w=160&h=150&position=5'
    },
    {
        name: '长沙站',
        address: '长沙市芙蓉区车站中路406号',
        index: 6,
        lng: 113.013801,
        lat: 28.193834,
        img: 'http://store.is.autonavi.com/showpic/f38f3f853ff79131f0fe49e4d5ae46fa'
    }
];

var ViewModel = function () {
    var self = this;
    // 窗口判断，小雨860 则隐藏左侧边栏
    if (window.innerWidth <= 860) {
        self.showStatus = ko.observable(false);
    } else {
        self.showStatus = ko.observable(true);
    }

    self.searchText = ko.observable(''); //搜索值绑定
    self.mapListData = ko.observableArray(mapList); // 地图列表绑定
    self.toggleShowStatus = function () {
        // 控制列表数据区域显示
        self.showStatus(!self.showStatus());
    };
    // 隐藏左侧边栏
    self.hideAside = function () {
        self.showStatus(false);
    };
    // 左侧地图列表点击事件
    self.selectListRow = function () {
        middleLinkage(this, this.lng, this.lat)
    };
    // 列表筛选
    self.filter = function () {
        self.mapListData(filterFun(self.searchText(), mapList));
    }
    // 天气 ，分别为最低，最高，天气类型
    self.weatherLow = ko.observable('获取中..');
    self.weatherHigh = ko.observable('获取中..');
    self.weatherType = ko.observable('获取中..');
    // 获取天气
    self.getWeather = function () {
        $.get('http://wthrcdn.etouch.cn/weather_mini?city=长沙', function (res) {
            var forecast = res.data.forecast[0];
            self.weatherHigh(forecast.high);
            self.weatherLow(forecast.low);
            self.weatherType(forecast.type)
        }, 'JSON');
    }
    self.getWeather();

};
ko.applyBindings(new ViewModel());

// 创建地图 
const CENTER = [112.962154, 28.186602];
var positions = [];
var map = new AMap.Map('mapContainer', {
    resizeEnable: true,
    zoom: 12,
    center: CENTER
});
// 部分变量初始化
var infoWindow = '' // 标注信息层变量
var markers = [];
var positions = [
    [112.896967, 28.187102],
    [112.941499, 28.206772],
    [112.937353, 28.182849],
    [112.962112, 28.187206],
    [112.97207, 28.193519],
    [112.981344, 28.183718],
    [113.013801, 28.193834],
];
// 地图控件
map.plugin(["AMap.ToolBar"], function () {
    map.addControl(new AMap.ToolBar());
});
// 实例化地图标记
addMarker(mapList);


/*********************
 * 以下为方法定义     **
 *********************/


/*
 * 联动中间方法,保证左侧地址数据列表与右侧地图标注一致
 * @params index: 数据列表数组下标。lng,lat :地点硬编码
 * 1.改变列数据列表样式，2.改变标注点样式，3.设置地图中心点。4.请求该地点详细信息 ，并展示
 */
function middleLinkage(data, lng, lat) {
    changeMarkerStyle(data.index);
    changeListStyle(data.index);
    setMapCenter(lng, lat);
    getMarkerInfo(data);
}

/*
 * 数组筛选
 * @params: searchtStr: 搜索字符串, container: 被搜索数组
 * @return 返回新的筛选结果
 */
function filterFun(searchtStr, container) {
    var newList = []; // 初始化结果数据
    var str = searchtStr.replace(/(^\s*)|(\s*$)/g, "");
    for (var i = 0; i < container.length; i++) {
        var arrElementName = container[i]['name'];
        // 查找用户搜索的字符串是否存在于该数组元素name中
        if (arrElementName.indexOf(str) !== -1) {
            // 存在

            newList.push(container[i]);
            newList[newList.length - 1]['index'] = newList.length - 1; // 重置index
        }
    }
    if (infoWindow) {
        infoWindow.close();   // 关闭信息层
    }
    map.remove(markers);  // 清楚地图标注
    markers = [];         // 置空 标注保存数组
    addMarker(newList);   // 重新设置地图标注， 保证与左侧数据筛选列表一致
    return newList;       // 返回新数组
}
/*
 * 改变列表选中状态
 * @params: index: napList数据位置索引
 */
function changeListStyle(index) {
    var mapList = document.getElementById('mapList');
    var mapListItems = mapList.getElementsByClassName('item');
    // 循环清楚其他已有高亮样式
    for (var i = 0; i < mapListItems.length; i++) {
        mapListItems[i].getElementsByClassName('desc-wrap')[0].className = 'desc-wrap';
    }
    // 为选中元素添加高亮样式
    mapListItems[index].getElementsByClassName('desc-wrap')[0].className = 'desc-wrap active';
}
/*
 * 改变地图标注样式
 * @params: index: napList数据位置索引
 */
function changeMarkerStyle(index) {
    for (var i = 0; i < markers.length; i++) {
        if (index === i) {
            // 添加高亮选中样式
            markers[i].setContent('<div class="marker-item marker-active">' + (i + 1) + '</div>');
        } else {
            markers[i].setContent('<div class="marker-item">' + (i + 1) + '</div>');
        }
    }
}
/*
 * 重新设置地图中心点
 * @params: lng,lat: 坐标硬编码
 */
function setMapCenter(lng, lat) {
    map.setCenter([lng, lat]);
}
/*
 * 标记点击事件
 * @params: e: 地图标注实例
 */
function markersClick(e) {
    var extData = e.target.getExtData();
    middleLinkage(extData, e.lnglat.lng, e.lnglat.lat)
}

/*
 * 高德地图api
 * 实例化点标记
 * @params: mapList: 地点列表数组,格式参考变量mapList
 */
function addMarker(mapList) {
    var position = [];
    for (var i = 0; i < mapList.length; i++) {
        //TODO 根据类别创建不同样式的marker
        var markerActive = '';
        if (i === 0) {
            markerActive = 'marker-active';
        }
        position = [mapList[i]['lng'], mapList[i]['lat']];
        // 设置标记信息
        var marker = new AMap.Marker({
            map: map,
            topWhenClick: true,
            clickable: true,
            position: position,
            zIndex: 10 - i,
            extData: {
                'index': i,
                'name': mapList[i]['name'],
                'address': mapList[i]['address'],
                'img': mapList[i]['img'],
                'lng': mapList[i]['lng'],
                'lat': mapList[i]['lat']
            },
            content: '<div class="marker-item">' + (i + 1) + '</div>'   //自定义点标记覆盖物内容
        });
        AMap.event.addListener(marker, 'click', markersClick); // 添加标记点击事件
        markers.push(marker); //存入markers变量中，为后续清除标记使用
    }
}
/*
 * 高德地图api
 * 实例化信息窗口，显示信息层
 * @params: lng,lat: 坐标硬编码. title:标题(地点名称), address: 地址，data:自定义数据
 */
function openInfo(lng, lat, title, address, data) {
    //构建信息窗体中显示的内容
    var info = [],
        img = '';
    if (data.state === 'ok') {
        var dataList = data.data.pagebean.contentlist[0];
        img = dataList.picList[0].picUrlSmall;
    } else {
        img = data.img;
    }
    info.push('<div style="display:flex;flex-direction:row;padding:0px" 0px 4px><img style="width:60px;height:40px;border-rarius:6px;" src="' + img + '" />');
    info.push('<div style="padding-left: 6px;"><span style="font-weight:500;font-size:12px">' + title + '</span>');
    info.push("<span style='font-size:12px'>地址 : " + address + "<span></div></div>");

    infoWindow = new AMap.InfoWindow({
        content: info.join("<br>"),
        offset: new AMap.Pixel(0, -20)
    });
    // 构建完成。显示
    infoWindow.open(map, [lng, lat]);
}

/*
 * 处理当前时间，主要用于异步请求时调用该方法
 * @return 返回处理后的当前时间
 */
function formatterDateTime() {
    var date = new Date()
    var month = date.getMonth() + 1
    var datetime = date.getFullYear()
        + ""// "年"
        + (month >= 10 ? month : "0" + month)
        + ""// "月"
        + (date.getDate() < 10 ? "0" + date.getDate() : date
            .getDate())
        + ""
        + (date.getHours() < 10 ? "0" + date.getHours() : date
            .getHours())
        + ""
        + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date
            .getMinutes())
        + ""
        + (date.getSeconds() < 10 ? "0" + date.getSeconds() : date
            .getSeconds());
    return datetime;
}

/* ajax 请求地点信息，请求成功则显示信息层
 * @parmas index: mapList数组中的下标位置
 */
function getMarkerInfo(data) {
    var lng = data['lng'],
        lat = data['lat'],
        name = data['name'],
        address = data['address'],
        img = data['img'];
    $.ajax({
        type: 'post',
        url: 'http://route.showapi.com/268-1',
        dataType: 'jsonp',
        data: {
            "showapi_timestamp": formatterDateTime(),
            "showapi_appid": '47676',
            "showapi_sign": 'b53b87dac2cd4e84bc5fec5f63a13b1c',
            "keyword": name,
            "cityId": "199"
        },
        jsonp: 'jsonpcallback', //这个方法名很重要,不能改变
        error: function (XmlHttpRequest, textStatus, errorThrown) {
            alert('很遗憾，该地点详细信息获取失败');// 失败
        },
        success: function (result) {
            if (result.showapi_res_code === 0) {
                var newResultBody = {};
                var resultBody = result.showapi_res_body;
                // 成功 打开信息层
                if (resultBody.pagebean.allNum <= 0 || !resultBody.pagebean.contentlist[0].picList[0]) {
                    // 请求成功，但是该地点没有详细数据,或者该数据下不存在图片，则使用默认图片
                    newResultBody = {state: 'err', text: '没有数据', img: img}
                } else {
                    // 成功且有数据且存在图片
                    newResultBody = {state: 'ok', 'text': '存在数据', data: resultBody}
                }
                // 调用openInfo函数，显示信息层
                openInfo(lng, lat, name, address, newResultBody);
            } else {
                alert('很遗憾，该地点详细信息获取失败');
            }
        }
    });
}
