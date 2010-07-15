var CartogramStarter = (function(){
    var that = {"worker": null};
    that.init = function(){
        that.worker = new Worker("js/cartogrambuild.js");
        that.worker.onmessage = that.onmessage;
        that.worker.onerror = that.onerror;
    };
    that.run = function(shapes, options){
        console.log(shapes);
        that.worker.postMessage({"shapes": shapes, "options": options});
    };
    that.onmessage = function(event){
        if(event.data.method == "log"){
            console.log("Worker: ", event.data.payload);
            jQuery("#logArea").val(event.data.payload+"\n"+jQuery("#logArea").val());
        } else if(event.data.method == "result"){
            jQuery("#newsvgArea").val(event.data.payload);
            jQuery("#newsvg").append(event.data.payload);
        }
    };
    that.onerror = function(error){
        console.error("Worker: ", error);
    };
    that.terminate = function(){
        if(that.worker){
            that.worker.terminate();
        }
    };
    return that;
}());

(function($){
    var nodeObj, mapping;
    
    var getXmlDoc = function(xml) {
        if (window.DOMParser) {
            var parser = new DOMParser();
            return parser.parseFromString(xml, 'text/xml');
        } else {
            xml = xml.replace(/<!DOCTYPE svg[^>]*>/, '');
            var xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
            xmlDoc.async = 'false';
            xmlDoc.loadXML(xml); 
            return xmlDoc;
        }               
    };
    
    var fetchXml = function(url, cb){
        $.get(url,function(data){
            cb(data);
        });
    };
    
    var createSvgTree = function(node, parent){
        var children = node.childNodes;
        var nodeObject = {"id": node.getAttribute("id"), "children": [], "nodeType": node.tagName};
        
        nodeObject.value = null;
        var dvalue = node.getAttribute("cartogramvalue");
        if(dvalue != null && dvalue != ""){
            nodeObject.value = parseFloat(dvalue);
        }

        nodeObject.parent = parent;
        for(var i=0;i<children.length;i++){
            var child = children[i];
            if(child.nodeName === "#text"){continue;}
            if(child.tagName === "g"){
                nodeObject.children.push(createSvgTree(child, node));
            } else if(child.tagName === "path"){
                var dvalue = child.getAttribute("cartogramvalue");
                if(dvalue != null && dvalue != ""){
                    dvalue = parseFloat(dvalue);
                } else {
                    dvalue = null;
                }
                nodeObject.children.push({"nodeType": "path", "d": child.getAttribute("d"), "id": child.getAttribute("id"), "value": dvalue});
            } else {
                console.log(child.nodeName);
            }
        }
        return nodeObject;
    };
    
    var createListStructure = function(nodes, htmlnode){
        var baseid = htmlnode.attr("id");
        var map = {};
        for(var i=0;i<nodes.length;i++){
            var node = nodes[i];
            var nodeid = baseid+"-"+i;
            console.log(nodeid);
            var nodevalue = (node.value === null) ? "" : node.value;
            map[nodeid] = node;
            if(node.nodeType === "g"){
                htmlnode.append('<li id="'+nodeid+'"><span class="carthagogram-treechild-span">Group '+node.id+'</span><input size="4" class="node-input" type="number" id="input-'+nodeid+'" value="'+nodevalue+'"/><br/><ul class="carthagogram-treenode" id="tree-'+nodeid+'"></ul></li>');
                var innermap = createListStructure(node.children, $('#tree-'+nodeid));
                for(var key in innermap){
                    map[key] = innermap[key];
                }
            } else if(node.nodeType === "path"){
                htmlnode.append('<li class="carthagogram-treechild" id="'+nodeid+'"><span class="carthagogram-treechild-span">'+node.id+'</span> <input size="4" class="node-input" type="number" id="input-'+nodeid+'" value="'+nodevalue+'"/></li>');
            }
        }
        return map;
    };
    
    var hoverOn = function(map){
        return function(e){
            e.stopPropagation();
            var nodeid = $(this).parent().attr("id");
            console.log("on", nodeid);
            var svgNode = $("#originalsvg #"+map[nodeid].id);
            svgNode.attr("oldFill", svgNode.css("fill"));
            svgNode.css("fill", "#fff");
        };
    };
    
    var hoverOff = function(map){
        return function(e){
            e.stopPropagation();
            var nodeid = $(this).parent().attr("id");
            console.log("off", nodeid, map[nodeid].id);
            console.log($("#originalsvg #"+map[nodeid].id).length);
            var svgNode = $("#originalsvg #"+map[nodeid].id);
            svgNode.css("fill", svgNode.attr("oldFill"));
            svgNode.attr("oldFill", null);
        };
    };
    
    var findValue = function(node){
        if (node.value != null){
            return node.value;
        } else if(node.parent != null){
            return findValue(node.parent);
        } else {
            return null;
        }
    };
    
    var constructShapes = function(node){
        if(node.nodeType === "path"){
            return [{"pointList": [node.d], "value": node.value, "id": node.id}];
        }
        var shapes = [];//{"pointList": [], value:"node.value"};
        var adopted = {"pointList": [], "value": node.value, "id": node.id};
        for(var i=0;i<node.children.length;i++){
            var temps = constructShapes(node.children[i]);
            for(var j=0;j<temps.length;j++){
                if(temps[j].value == null){
                    $.merge(adopted.pointList, temps[j].pointList);
                } else {
                    shapes.push(temps[j]);
                }
            }
        }
        shapes.push(adopted);
        return shapes;
    };
    
    var prepareCartogramStart = function(e){
        e.preventDefault();
        for(var nodeid in mapping){
            var val = parseFloat($('#input-'+nodeid).val());
            if (isNaN(val)){
                mapping[nodeid].value = null;
            } else {
                mapping[nodeid].value = val;
            }
        }
        var shapes = constructShapes(nodeObj);
        shapes = getCoordinateLists(shapes);
        CartogramStarter.init();
        CartogramStarter.run(shapes, {});
    };
    
    var getCoordinateLists = function(shapes){
        var nshapes = [];
        for(var i=0;i<shapes.length;i++){
            var pointList = [];
            for(var j=0;j<shapes[i].pointList.length;j++){
                if(shapes[i].value != null){
                    var points = convertSVGString(shapes[i].pointList);
                    nshapes.push(shapes[i]);
                    nshapes[i].coordinateLists = points;
                }
            }
        }
        return nshapes;
    };
    
    var convertSVGString = function(pointList){
        var moves = Raphael.parsePathString(pointList);
        var currentPoint = null, lastPoint = null;
        var points = [];
        var pointi = 0;
        for(var k=0;k<moves.length;k++){
            if(moves[k][0] == "Z" || moves[k][0] == "z"){
                pointi += 1;
                lastPoint = null;
                continue;
            }
            else if(moves[k][0] == "M"){
                currentPoint = {"x": moves[k][1], "y": moves[k][2]};
                points.push([]);
            }
            else if(moves[k][0] == "m"){
                if (lastPoint == null){
                    currentPoint = {"x": moves[k][1], "y": moves[k][2]};
                } else {
                    currentPoint = {"x": lastPoint.x+moves[k][1], "y": lastPoint.y+moves[k][2]};
                }
                points.push([]);
            }
            else if(moves[k][0] == "l"){
                currentPoint = {"x": lastPoint.x+moves[k][1], "y": lastPoint.y+moves[k][2]};
            }
            else if(moves[k][0] == "L"){
                currentPoint = {"x": moves[k][1], "y": moves[k][2]};
            }
            else if(moves[k][0] == "C"){
                currentPoint = {"x": moves[k][5], "y": moves[k][6]};
            }
            else if(moves[k][0] == "c"){
                currentPoint = {"x": lastPoint.x+moves[k][5], "y": lastPoint.y+moves[k][6]};
            }
            else if(moves[k][0] == "S"){
                currentPoint = {"x": moves[k][3], "y": moves[k][4]};
            }
            else if(moves[k][0] == "s"){
                currentPoint = {"x": lastPoint.x+moves[k][3], "y": lastPoint.y+moves[k][4]};
            }
            else if(moves[k][0] == "Q"){
                currentPoint = {"x": moves[k][3], "y": moves[k][4]};
            }
            else if(moves[k][0] == "q"){
                currentPoint = {"x": lastPoint.x+moves[k][3], "y": lastPoint.y+moves[k][4]};
            }
            else if(moves[k][0] == "T"){
                currentPoint = {"x": moves[k][1], "y": moves[k][2]};
            }
            else if(moves[k][0] == "t"){
                currentPoint = {"x": lastPoint.x+moves[k][1], "y": lastPoint.y+moves[k][2]};
            }
            else if(moves[k][0] == "A"){
                currentPoint = {"x": moves[k][6], "y": moves[k][7]};
            }
            else if(moves[k][0] == "a"){
                currentPoint = {"x": lastPoint.x+moves[k][6], "y": lastPoint.y+moves[k][7]};
            }
            else if(moves[k][0] == "h"){
                currentPoint = {"x": lastPoint.x+moves[k][1], "y": lastPoint.y};
            }
            else if(moves[k][0] == "H"){
                currentPoint = {"x": moves[k][1], "y": lastPoint.y};
            }
            else if(moves[k][0] == "v"){
                currentPoint = {"x": lastPoint.x, "y": lastPoint.y+moves[k][1]};
            }
            else if(moves[k][0] == "V"){
                currentPoint = {"x": lastPoint.x, "y": moves[k][1]};
            }
            points[pointi].push({"x": currentPoint.x, "y": currentPoint.y});
            lastPoint = {"x": currentPoint.x, "y": currentPoint.y};
        }
        return points;
    };
    
    var parseSvg = function(doc){
        if (doc === ""){
            alert("SVG fetch failed! Don't run this via file:// and check existence of svg directory.");
            return;
        }
        var root = document.importNode(doc.documentElement, true);        
        $("#originalsvg").append(root);
        nodeObj = createSvgTree(root, null);
        $("#svgtitle").text(nodeObj.id);
        mapping = createListStructure(nodeObj.children, $("#svgtree"));
        $(".carthagogram-treechild-span").mouseover(hoverOn(mapping));
        $(".carthagogram-treechild-span").mouseout(hoverOff(mapping));
        $("#abort-cartogram").click(function(){
            CartogramStarter.terminate();
        });
        $("#createnext").click(prepareCartogramStart);
        $("#section-values").show();
    };

    $(document).ready(function(){
        $("#svgnext").click(function(e){
            if(e && e.preventDefault){e.preventDefault();}
            var map = $("#svgchooser").val();
            if(map !== ""){
                fetchXml("svg/"+map+".svg", parseSvg);
            } else {
                var xml = $("#svginput").val();
                if (xml !== ""){
                    parseSvg(getXmlDoc(xml));
                } else {
                    alert("Please specify an input map");
                }
            }
        });
    });

}(jQuery));