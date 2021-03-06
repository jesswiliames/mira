"use strict";

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([
            'underscore'
        ], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(
            require('underscore')
        );
    }
}(this, function (_) {

    var KEYWORD_REGEXP = /^(abstract|boolean|break|byte|case|catch|char|class|const|continue|debugger|default|delete|do|double|else|enum|export|extends|false|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|transient|true|try|typeof|undefined|var|void|volatile|while|with)$/;

    function legalKey(string) {
        return /^[a-z_$][0-9a-z_$]*$/gi.test(string) && !KEYWORD_REGEXP.test(string);
    }

    var esse = {
        buildFunction: function (value, context) {
            var func;
            if (_.isString(value)) {
                func = function (data) {
                    try {
                        return eval(value);
                    } catch (ex) {
                        console.log('erro na funcao do parser da rota ', value);
                        return data
                    }
                };
            } else if (_.isFunction(value)) {
                func = value
            }
            if (func && context) {
                func = _.bind(func, context);
            }
            return func
        },

        buildObjectToValidate: function ($data, $env, options) {
            if ($data instanceof Backbone.Model) {
                $data = $data.attributes;
            }
            options || (options = {});
            return _.extend({}, {
                $data: $data,
                $env: $env
            }, options)
        },

        evaluate: function (when, $data, $env) {
            if ($data instanceof Backbone.Model) {
                $data = $data.attributes;
            }
            var array_when;
            if(_.isString(when)) {
                array_when = when.split(',');
            } else {
                array_when = [when];
            }
            var ret = true;
            _.each(array_when, function(w){
                var rule = mira.interface.rules.get_or_create(w);
                    ret = ret && rule.evaluate($data, $env, $data);
            });
            return ret
        },

        navigate: function (uri) {
            return '#?URI=' + uri;
        },

        build_context: function($data, $env, options, extra) {
            return _.extend({}, options, {
                $data:$data.attributes,
                $env:$env,
                $dataObj: $data
            }, extra);
        },

        build_object_with_context: function(attrs, context){
            var ret = {};
            _.each(attrs, function(value, attr){
                var template = '<%= ' + value + '%>';
                try {
                    var build = _.template(template, context);
                    ret[attr] = build;
                } catch (ex){
                    ret[attr] = value;
                }
            });
            return ret;
        },

        build_attributes: function(element, attrs, context){
            var obj = esse.build_object_with_context(attrs, context);
            _.each(obj, function(value, attr){
                element.setAttribute(attr,  value);
            });
        },

        build_value: function(value, context){
            if(value.indexOf('@') == 0){
                return value.substring(1);
            }
            var template = "<%= " + value + '%>';
            try {
                return _.template(template, context)
            } catch (ex){
                return value
            }

        },

        parseURL: function(url) {
            var a =  document.createElement('a');
            a.href = url;
            return {
                source: url,
                protocol: a.protocol.replace(':',''),
                host: a.hostname,
                port: a.port,
                query: a.search,
                params: (function(){
                    var ret = {},
                        seg = a.search.replace(/^\?/,'').split('&'),
                        len = seg.length, i = 0, s;
                    for (;i<len;i++) {
                        if (!seg[i]) { continue; }
                        s = seg[i].split('=');
                        ret[s[0]] = s[1];
                    }
                    return ret;
                })(),
                file: (a.pathname.match(/\/([^\/?#]+)$/i) || [,''])[1],
                hash: a.hash.replace('#',''),
                path: a.pathname.replace(/^([^\/])/,'/$1'),
                relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [,''])[1],
                segments: a.pathname.replace(/^\//,'').split('/')
            };
        },

        source: function (object, filter, indent, startingIndent) {
            var seen = [];
            return walk(object, filter, indent === undefined ? '  ' : (indent || ''), startingIndent || '');

            function walk(object, filter, indent, currentIndent) {
                var nextIndent = currentIndent + indent;
                object = filter ? filter(object) : object;
                switch (typeof object) {
                    case 'string':
                        return JSON.stringify(object);
                    case 'boolean':
                    case 'number':
                    case 'function':
                    case 'undefined':
                        return '' + object
                }

                if (object === null) return 'null';
                if (object instanceof RegExp) return object.toString();
                if (object instanceof Date) return 'new Date(' + object.getTime() + ')';

                if (seen.indexOf(object) >= 0) return '{$circularReference:1}';
                seen.push(object);

                function join(elements) {
                    return indent.slice(1) + elements.join(',' + (indent && '\n') + nextIndent) + (indent ? ' ' : '');
                }

                if (Array.isArray(object)) {
                    return '[' + join(object.map(function (element) {
                        return walk(element, filter, indent, nextIndent);
                    })) + ']'
                }
                var keys = Object.keys(object);
                return keys.length ? '{' + join(keys.map(function (key) {
                    return (legalKey(key) ? key : JSON.stringify(key)) + ':' + walk(object[key], filter, indent, nextIndent);
                })) + '}' : '{}'
            }
        }
    };
    return esse;
}));