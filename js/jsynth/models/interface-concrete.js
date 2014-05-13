"use strict";

define([
    'jquery',
    'underscore',
    'backbone',
    'jsynth/base/model',
    'jsynth/collections/widget-concrete'
], function ($, _, Backbone, ModelBase, CollectionWidgetConcrete) {

    return ModelBase.extend({

        idAttribute: 'name',

        parse: function(data){
            data.widgets = new CollectionWidgetConcrete(data.widgets, {parse:true});
            return data;
        },

        load: function () {
            if(!this.loaded) {
                this.get('widgets').invoke('load');
                this.loaded = true;
            }
        },

        mapWidgets: function (widgets_abstract) {
            this.get('widgets').each(function(widget_concrete){
                var map_to = widget_concrete.get('name');
                var widget_abstract = widgets_abstract.get(map_to);
                if(widget_abstract) {
                    widget_abstract.set('concrete', widget_concrete);
                } else {
                    console.log('WidgetAbstract "' + map_to + '" not founded on AbstractInterface "' + this.get('name') + '"')
                }
            }, this);
        }
    });

});