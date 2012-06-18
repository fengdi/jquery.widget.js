/**
 * jQuery.Widget.js
 * Copyright 2011, tangoboy
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * Logic borrowed from jQuery Scrollable and kissy Switchable
 * @author:zhulutangoboy@gmail.com
 * date 2011.08.10
 *
 * jQuery.Widget([selector]);
 * 
 * 
 *
 * jQuery(selector).Carousel(config);
 *
 */

(function(HOST,JQ){
	var $ = JQ,
	DOC = HOST.document,
	DISPLAY = 'display', BLOCK = 'block', NONE = 'none',
    OPACITY = 'opacity', Z_INDEX = 'z-index',
    POSITION = 'position', RELATIVE = 'relative', ABSOLUTE = 'absolute',
    SCROLLX = 'scrollx', SCROLLY = 'scrolly', FADE = 'fade',
    LEFT = 'left', TOP = 'top', FLOAT = 'float', PX = 'px',
    EMPTY = '',
    FORWARD = 'forward', BACKWARD = 'backward',
    DOT = '.',
    Effects,
    EVENT_INIT = 'init',
    DOM_EVENT = {originalEvent:{target:1}},
    EVENT_BEFORE_SWITCH = 'beforeSwitch', EVENT_SWITCH = 'switch',
    CLS_PREFIX = 'ks-switchable-',
    PREV_BTN = 'prevBtn',
    NEXT_BTN = 'nextBtn';
	
	
	
	
	$.extend({
		inherit : function(r, s, px, sx) {
	        if (!s || !r) {
	            return r;
	        }
	        var create = Object.create ?
	            function(proto, c) {
	                return Object.create(proto, {
	                        constructor: {
	                            value: c
	                        }
	                    });
	            } :
	            function (proto, c) {
	                function F() {
	                }
	
	                F.prototype = proto;
	
	                var o = new F();
	                o.constructor = c;
	                return o;
	            },
	            sp = s.prototype,
	            rp;
	
	        // add prototype chain
	        rp = create(sp, r);
	        r.prototype = $.extend(rp, r.prototype);
	        r.superclass = create(sp, s);
	
	        // add prototype overrides
	        if (px) {
	        	$.extend(rp, px);
	        }
	
	        // add object overrides
	        if (sx) {
	        	$.extend(r, sx);
	        }
	        return r;
	    },
	    fnbind:function(fn, obj) {
		        var slice = [].slice,
		        args = slice.call(arguments, 2),
		        fNOP = function () {
		        },
		        bound = function () {
		            return fn.apply(this instanceof fNOP ? this : obj,
		                args.concat(slice.call(arguments)));
		        };
		    fNOP.prototype = fn.prototype;
		    bound.prototype = new fNOP();
		    return bound;
		}
	});
	
	
	
	
	
	
	/**
     * Switchable Widget
     * attached members：
     *   - this.container
     *   - this.config
     *   - this.triggers  可以为空值 []
     *   - this.panels    可以为空值 []
     *   - this.content
     *   - this.length
     *   - this.activeIndex
     *   - this.switchTimer
     */
	function Switchable(container, config) {
        var self = this;
        // 调整配置信息
        config = config || {};
        if (!('markupType' in config)) {
            if (config.panelCls) {
                config.markupType = 1;
            } else if (config.panels) {
                config.markupType = 2;
            }
        }
        // init config by hierarchy
        var host = this.constructor;
        
        
        while (host) {
            config = $.extend({},host.Config,config);
            host = host.superclass ? host.superclass.constructor : null;
        }
        /**
         * the container of widget
         * @type HTMLElement
         */
        self.container = $(container)[0];

        /**
         * 配置参数
         * @type Object
         */
        self.config = config;

        /**
         * triggers
         * @type Array of HTMLElement
         */
        //self.triggers

        /**
         * panels
         * @type Array of HTMLElement
         */
        //self.panels

        /**
         * length = panels.length / steps
         * @type number
         */
        //self.length

        /**
         * the parentNode of panels
         * @type HTMLElement
         */
        //self.content

        /**
         * 当前状态，动画完毕，动画中比 activeIndex 落后 1
         * @type Number
         */
        self.activeIndex = self.completedIndex = config.activeIndex;

        //设置了 activeIndex
        if (self.activeIndex > -1) {
        }
        //设置了 switchTo , activeIndex == -1
        else if (typeof config.switchTo == "number") {
        }
        //否则，默认都为 0
        else {
            self.completedIndex = self.activeIndex = 0;
        }


        self._init();
        self._initPlugins();
        $(self).trigger(EVENT_INIT);
        
        if (self.activeIndex > -1) {
        } else if (typeof config.switchTo == "number") {
            self.switchTo(config.switchTo);
        }

    }
	
	
	// 默认配置
    Switchable.Config = {
        markupType: 0, // markup 的类型，取值如下：

        // 0 - 默认结构：通过 nav 和 content 来获取 triggers 和 panels
        navCls: CLS_PREFIX + 'nav',
        contentCls: CLS_PREFIX + 'content',

        // 1 - 适度灵活：通过 cls 来获取 triggers 和 panels
        triggerCls: CLS_PREFIX + 'trigger',
        panelCls: CLS_PREFIX + 'panel',

        // 2 - 完全自由：直接传入 triggers 和 panels
        triggers: [],
        panels: [],

        // 是否有触点
        hasTriggers: true,

        // 触发类型
        triggerType: 'mouse', // or 'click'
        // 触发延迟
        delay: .1, // 100ms

        activeIndex: -1, // markup 的默认激活项应与 activeIndex 保持一致
        activeTriggerCls: 'ks-active',
        // switchTo: 0,  // 初始切换到面板，默认第一个

        // 可见视图内有多少个 panels
        steps: 1,

        // 可见视图区域的大小。一般不需要设定此值，仅当获取值不正确时，用于手工指定大小
        viewSize: []
    };
    
    
    function getDomEvent(e) {
        var originalEvent = {};
        originalEvent.type = e.originalEvent.type;
        originalEvent.target = e.originalEvent.target || e.originalEvent.srcElement;
        return {originalEvent:originalEvent};
    }

    Switchable.getDomEvent = getDomEvent;

    // 插件
    Switchable.Plugins = [];
    
    
    
    $.extend(Switchable.prototype,{
    	 _initPlugins:function() {
             // init plugins by Hierarchy
    		 
             var self = this,
                 pluginHost = self.constructor;
             while (pluginHost) {
            	 if(pluginHost.Plugins){
	                 $.each(pluginHost.Plugins,function(i,plugin) {
	                	 //console.log(self);
	                     if (plugin.init) {
	                         plugin.init(self);
	                     }
	                 });
            	 }
                 pluginHost = pluginHost.superclass ?
                     pluginHost.superclass.constructor :
                     null;
             }
         },

         /**
          * init switchable
          */
         _init: function() {
             var self = this,
                 cfg = self.config;

             // parse markup
             self._parseMarkup();

             // bind triggers
             if (cfg.hasTriggers) {
                 self._bindTriggers();
             }
             
             $.fnbind(self,EVENT_BEFORE_SWITCH,function(){
            	 return true;
             });
             
         },

         /**
          * 解析 markup, 获取 triggers, panels, content
          */
         _parseMarkup: function() {
             var self = this, container = self.container,
                 cfg = self.config,
                 nav, content, triggers = [], panels = [],
                 //i,
                 n
                 //m
                 ;

             switch (cfg.markupType) {
                 case 0: // 默认结构
                     nav = $(DOT + cfg.navCls, container);
                     if (nav[0]) triggers = $(nav).children().get();
                     content = $(DOT + cfg.contentCls, container)[0];
                     panels = $(content).children().get();
                     break;
                 case 1: // 适度灵活
                     triggers = $(DOT + cfg.triggerCls, container).get();
                     panels = $(DOT + cfg.panelCls, container).get();
                     break;
                 case 2: // 完全自由
                     triggers = cfg.triggers;
                     panels = cfg.panels;
                     break;
             }


             // get length
             n = panels.length;
             self.length = n / cfg.steps;

             // 自动生成 triggers
             if (cfg.hasTriggers && n > 0 && triggers.length === 0) {
                 triggers = self._generateTriggersMarkup(self.length);
             }

             // 将 triggers 和 panels 转换为普通数组
             self.triggers = $.makeArray(triggers);
             self.panels = $.makeArray(panels);

             // get content
             self.content = content || panels[0].parentNode;
             self.nav = nav || cfg.hasTriggers && triggers[0].parentNode;
         },

         /**
          * 自动生成 triggers 的 markup
          */
         _generateTriggersMarkup: function(len) {
             var self = this,
             	cfg = self.config,
             	ul = DOC.createElement('ul'),
             	li,i;
             
             ul.className = cfg.navCls;
             
             for(i=0;i<len;i++){
                 li = DOC.createElement('li');
                 if (i === self.activeIndex){
                     li.className = cfg.activeTriggerCls;
                 }
                 li.innerHTML = i+1;
                 ul.appendChild(li);
             }
             self.container.appendChild(ul);
             return $(ul).children().get();
         },

         /**
          * 给 triggers 添加事件
          */
         _bindTriggers: function() {
        	 
             var self = this, cfg = self.config,
                 triggers = self.triggers, trigger,
                 i, len = triggers.length;

             for (i = 0; i < len; i++) {
                 (function(index) {
                     trigger = triggers[index];

                     $(trigger).bind('click', function(e) {
                         self._onFocusTrigger(index, e);
                     });

                     if (cfg.triggerType === 'mouse') {
                    	 $(trigger).bind('mouseenter', function(e) {
                             self._onMouseEnterTrigger(index, e);
                         });
                    	 $(trigger).bind('mouseleave', function() {
                             self._onMouseLeaveTrigger(index);
                         });
                     }
                 })(i);
             }
         },

         /**
          * click or tab 键激活 trigger 时触发的事件
          */
         _onFocusTrigger: function(index, e) {
             var self = this;
             if (!self._triggerIsValid(index)) return; // 重复点击

             this._cancelSwitchTimer(); // 比如：先悬浮，再立刻点击，这时悬浮触发的切换可以取消掉。
             self.switchTo(index, undefined, getDomEvent(e));
         },

         /**
          * 鼠标悬浮在 trigger 上时触发的事件
          */
         _onMouseEnterTrigger: function(index, e) {
             var self = this;
             if (!self._triggerIsValid(index)) {
                 return;
             } // 重复悬浮。比如：已显示内容时，将鼠标快速滑出再滑进来，不必再次触发。
             var ev = getDomEvent(e);
             self.switchTimer = HOST.setTimeout(function() {
                 self.switchTo(index, undefined, ev);
             }, self.config.delay * 1000);
         },

         /**
          * 鼠标移出 trigger 时触发的事件
          */
         _onMouseLeaveTrigger: function() {
             this._cancelSwitchTimer();
         },

         /**
          * 重复触发时的有效判断
          */
         _triggerIsValid: function(index) {
             return this.activeIndex !== index;
         },

         /**
          * 取消切换定时器
          */
         _cancelSwitchTimer: function() {
             var self = this;
             if (self.switchTimer) {
            	 clearTimeout(self.switchTimer);
            	 clearInterval(self.switchTimer);
                 //self.switchTimer.cancel();
                 self.switchTimer = undefined;
             }
         },

         /**
          * 切换操作，对外 api
          * @param index 要切换的项
          * @param direction 方向，用于 effect
          * @param ev 引起该操作的事件
          * @param callback 运行完回调，和绑定 switch 事件作用一样
          */
         switchTo: function(index, direction, ev, callback) {
             var self = this,
                 cfg = self.config,
                 triggers = self.triggers,
                 panels = self.panels,
                 ingIndex = self.activeIndex,
                 steps = cfg.steps,
                 fromIndex = ingIndex * steps,
                 toIndex = index * steps;

             // 再次避免重复触发
             if (!self._triggerIsValid(index)) {
                 return self;
             }
             
             
             /*var r = ;
             
             console.log(r);
             */
             
             
             if($.inArray($(self).trigger(EVENT_BEFORE_SWITCH, {toIndex: index}),false) != -1) {
                 return self;
             }


             // switch active trigger
             if (cfg.hasTriggers) {
                 self._switchTrigger(ingIndex > -1 ? triggers[ingIndex] : null, triggers[index]);
             }

             // switch active panels
             if (direction === undefined) {
                 direction = index > ingIndex ? FORWARD : BACKWARD;
             }

             // switch view
             self._switchView(
                 ingIndex > -1 ? panels.slice(fromIndex, fromIndex + steps) : null,
                 panels.slice(toIndex, toIndex + steps),
                 index,
                 direction, ev, function() {
                     callback && callback.call(self, index);
                     // update activeIndex
                     self.completedIndex = index;
                 });
             self.activeIndex = index;
             return self; // chain
         },

         /**
          * 切换当前触点
          */
         _switchTrigger: function(fromTrigger, toTrigger/*, index*/) {
             var activeTriggerCls = this.config.activeTriggerCls;

             if (fromTrigger) {
                 $(fromTrigger).removeClass(activeTriggerCls);
             }
             $(toTrigger).addClass(activeTriggerCls);
         },

         /**
          * 切换视图
          */
         _switchView: function(fromPanels, toPanels, index, direction, ev, callback) {
             // 最简单的切换效果：直接隐藏/显示
             if (fromPanels) {
                 $(fromPanels).css(DISPLAY, NONE);
             }
             $(toPanels).css(DISPLAY, BLOCK);
             
             
             
             // fire onSwitch events
             this._fireOnSwitch(index, ev);
             callback && callback.call(this);
         },

         /**
          * 触发 switch 相关事件
          */
         _fireOnSwitch: function(index, ev) {

             $(this).trigger(EVENT_SWITCH, $.extend(ev || {}, { currentIndex: index }));
         },

         /**
          * 切换到上一视图
          */
         prev: function(ev) {
             var self = this, activeIndex = self.activeIndex;
             self.switchTo(activeIndex > 0 ? activeIndex - 1 : self.length - 1, BACKWARD, ev);
         },

         /**
          * 切换到下一视图
          */
         next: function(ev) {
             var self = this, activeIndex = self.activeIndex;
             self.switchTo(activeIndex < self.length - 1 ? activeIndex + 1 : 0, FORWARD, ev);
         }
         
         
         
     	});
    
    
    /**
     *自动播放插件
     */
    $.extend(Switchable.Config, {
        autoplay: false,
        interval: 5, // 自动播放间隔时间
        pauseOnHover: true  // triggerType 为 mouse 时，鼠标悬停在 slide 上是否暂停自动播放
    });
    
    Switchable.Plugins.push({
        name: 'autoplay',
        init: function(host) {
        	
            var cfg = host.config, interval = cfg.interval * 1000, timer;
            if (!cfg.autoplay) return;
            // 鼠标悬停，停止自动播放
            if (cfg.pauseOnHover) {
                $(host.container).bind('mouseenter', function() {
                    host.stop();
                });
                $(host.container).bind('mouseleave', function() {
                    host.start();
                });
            }

            function startAutoplay() {
                // 设置自动播放
                timer = setInterval(function() {
                    if (host.paused) return;
                    // 自动播放默认 forward（不提供配置），这样可以保证 circular 在临界点正确切换
                    host.switchTo(host.activeIndex < host.length - 1 ? host.activeIndex + 1 : 0, 'forward');
                }, interval);
            }

            // go
            startAutoplay();

            // 添加 stop 方法，使得外部可以停止自动播放
            host.stop = function() {
                if (timer) {
                    clearInterval(timer);
                    timer = undefined;
                }
                host.paused = true; // paused 可以让外部知道 autoplay 的当前状态

            };

            host.start = function() {
                if (timer) {
                	clearInterval(timer);
                    timer = undefined;
                }
                host.paused = false;

                startAutoplay();

            };
        }
    });
    
    
    /**
     *动画插件
     */
    $.extend(Switchable.Config, {
        effect: NONE, // 'scrollx', 'scrolly', 'fade' 或者直接传入 custom effect fn
        duration: .5, // 动画的时长
        easing: 'linear', // easing method
        nativeAnim: true
    });
    
    Effects = Switchable.Effects = {
            // 最朴素的显示/隐藏效果
            none: function(fromEls, toEls, callback) {
                if (fromEls) {
                    $(fromEls).css(DISPLAY, NONE);
                }
                $(toEls).css(DISPLAY, BLOCK);
                callback();
            },
            // 淡隐淡现效果
            fade: function(fromEls, toEls, callback) {
                if (fromEls) {
                    if (fromEls.length !== 1) {
                        $.error('fade effect only supports steps == 1.');
                    }
                }
                var self = this,
                    cfg = self.config,
                    fromEl = fromEls ? fromEls[0] : null,
                    toEl = toEls[0];
                    
                //console.log(fromEls, toEls);
                if (self.anim) {
                	//console.log("anim");
                    // 不执行回调
                	$(self.anim.fromEl).stop(true);
                    // 防止上个未完，放在最下层
                    $(self.anim.fromEl).css({
                        zIndex: 1,
                        opacity:0
                    });
                    // 把上个的 toEl 放在最上面，防止 self.anim.toEl == fromEL
                    // 压不住后面了
                    $(self.anim.toEl).css({
                        zIndex: 9
                    });
                }
                
                // 首先显示下一张
                $(toEl).css(OPACITY, 1);
                
                if (fromEl) {
	                self.anim = {};
	                $(fromEl).stop(true).animate({opacity:0}, cfg.duration*1000, cfg.easing, function() {
	                    // 切换 z-index
	                	self.anim = undefined; // free
	                	
	                    $(toEl).css(Z_INDEX, 9);
	                    $(fromEl).css(Z_INDEX, 1);
	                    callback && callback();
	                });
	                
	                self.anim.toEl = toEl;
	                self.anim.fromEl = fromEl;
                }else{
                	$(toEl).css(Z_INDEX, 9);
                    callback && callback();
                }
            },
         // 水平/垂直滚动效果
            scroll: function(fromEls, toEls, callback, index) {
            	//console.log('fromEls');
            	
                var self = this, cfg = self.config,
                    isX = cfg.effect === SCROLLX,
                    diff = self.viewSize[isX ? 0 : 1] * index,
                    props = { };

                props[isX ? LEFT : TOP] = -diff + PX;
                
                
                if (self.anim) {
                    $(self.content).stop(true);
                }

                if (fromEls) {
                	self.anim = {};
                	$(self.content).stop(true).animate(props, cfg.duration*1000, cfg.easing, function() {
                        self.anim = undefined; // free
                        callback && callback();
                        
                    });
                } else {
                    $(self.content).css(props);
                    callback && callback();
                }

            }
    };
    Effects[SCROLLX] = Effects[SCROLLY] = Effects.scroll;
    
    Switchable.Plugins.push({

        name: 'effect',

        /**
         * 根据 effect, 调整初始状态
         */
        init: function(host) {
            var cfg = host.config, effect = cfg.effect,
                panels = host.panels, content = host.content,
                steps = cfg.steps,
                activeIndex = host.activeIndex,
                len = panels.length;

            // 1. 获取高宽
            host.viewSize = [
                cfg.viewSize[0] || panels[0].offsetWidth * steps,
                cfg.viewSize[1] || panels[0].offsetHeight * steps
            ];
            // 注：所有 panel 的尺寸应该相同
            //    最好指定第一个 panel 的 width 和 height, 因为 Safari 下，图片未加载时，读取的 offsetHeight 等值会不对

            // 2. 初始化 panels 样式
            if (effect !== NONE) { // effect = scrollx, scrolly, fade

                // 这些特效需要将 panels 都显示出来
                $.each(panels, function(i,panel) {
                    $(panel).css(DISPLAY, BLOCK);
                });

                switch (effect) {
                    // 如果是滚动效果
                    case SCROLLX:
                    case SCROLLY:
                        // 设置定位信息，为滚动效果做铺垫
                        $(content).css(POSITION, ABSOLUTE);

                        $(content.parentNode).css(POSITION, RELATIVE); // 注：content 的父级不一定是 container

                        // 水平排列
                        if (effect === SCROLLX) {
                            $(panels).css(FLOAT, LEFT);

                            // 设置最大宽度，以保证有空间让 panels 水平排布
                            $(content).width( host.viewSize[0] * (len / steps));
                        }
                        break;

                    // 如果是透明效果，则初始化透明
                    case FADE:
                        var min = activeIndex * steps,
                            max = min + steps - 1,
                            isActivePanel;

                        $.each(panels, function(i,panel) {
                            isActivePanel = i >= min && i <= max;
                            $(panel).css({
                                    opacity: isActivePanel ? 1 : 0,
                                    position: ABSOLUTE,
                                    zIndex: isActivePanel ? 9 : 1
                            });
                        });
                        break;
                }
            }

            // 3. 在 CSS 里，需要给 container 设定高宽和 overflow: hidden
        }
    });
    $.extend(Switchable.prototype, {
        _switchView: function(fromEls, toEls, index, direction, ev, callback) {

            var self = this, cfg = self.config,
                effect = cfg.effect,
                fn = $.isFunction(effect) ? effect : Effects[effect];

            fn.call(self, fromEls, toEls, function() {
                self._fireOnSwitch(index, ev);
                callback && callback.call(self);
            }, index, direction);
        }
    });
    
    /**
     *	Circular Plugin
     */
    $.extend(Switchable.Config, {
        circular: false
    });
    /**
     * 循环滚动效果函数
     */
    function circularScroll(fromEls, toEls, callback, index, direction) {
        var self = this, cfg = self.config,
            len = self.length,
            activeIndex = self.activeIndex,
            isX = cfg.scrollType === SCROLLX,
            prop = isX ? LEFT : TOP,
            viewDiff = self.viewSize[isX ? 0 : 1],
            diff = -viewDiff * index,
            props = {},
            isCritical,
            isBackward = direction === BACKWARD;

        // 从第一个反向滚动到最后一个 or 从最后一个正向滚动到第一个
        isCritical = (isBackward && activeIndex === 0 && index === len - 1)
            || (direction === FORWARD && activeIndex === len - 1 && index === 0);

        if (isCritical) {
            // 调整位置并获取 diff
            diff = adjustPosition.call(self, self.panels, index, isBackward, prop, viewDiff);
        }
        props[prop] = diff + PX;

        // 开始动画

        if (self.anim) {
        	$(self.anim.fromEl).stop(true);
            //self.anim.stop();
        }
        self.anim = {};
        $(self.content).stop(true).animate(props, cfg.duration*1000, cfg.easing, function() {
            if (isCritical) {
                // 复原位置
                resetPosition.call(self, self.panels, index, isBackward, prop, viewDiff);
            }
            self.anim = undefined;// free
            callback();
        });

    }

    /**
     * 调整位置
     */
    function adjustPosition(panels, index, isBackward, prop, viewDiff) {
        var self = this, cfg = self.config,
            steps = cfg.steps,
            len = self.length,
            start = isBackward ? len - 1 : 0,
            from = start * steps,
            to = (start + 1) * steps,
            i;

        // 调整 panels 到下一个视图中
        for (i = from; i < to; i++) {
            $(panels[i]).css(POSITION, RELATIVE);
            $(panels[i]).css(prop, (isBackward ? -1 : 1) * viewDiff * len);
        }

        // 偏移量
        return isBackward ? viewDiff : -viewDiff * len;
    }

    /**
     * 复原位置
     */
    function resetPosition(panels, index, isBackward, prop, viewDiff) {
        var self = this, cfg = self.config,
            steps = cfg.steps,
            len = self.length,
            start = isBackward ? len - 1 : 0,
            from = start * steps,
            to = (start + 1) * steps,
            i;

        // 滚动完成后，复位到正常状态
        for (i = from; i < to; i++) {
            $(panels[i]).css(POSITION, EMPTY);
            $(panels[i]).css(prop, EMPTY);
        }

        // 瞬移到正常位置
        $(self.content).css(prop, isBackward ? -viewDiff * (len - 1) : EMPTY);
    }

    /**
     * 添加插件
     */
    Switchable.Plugins.push({

            name: 'circular',

            /**
             * 根据 effect, 调整初始状态
             */
            init: function(host) {
                var cfg = host.config;

                // 仅有滚动效果需要下面的调整
                if (cfg.circular && (cfg.effect === SCROLLX || cfg.effect === SCROLLY)) {
                    // 覆盖滚动效果函数
                    cfg.scrollType = cfg.effect; // 保存到 scrollType 中
                    cfg.effect = circularScroll;
                }
            }
        });

    
    
    //console.log(Switchable.Plugins);
    
    
    /**
     * Slide Class
     * @constructor
     */
    var Slide  = (function(){
    	function Slide(container, config) {
            var self = this;

            // factory or constructor
            if (!(self instanceof Slide)) {
                return new Slide(container, config);
            }
            //console.log(Slide.superclass.constructor);
            Slide.superclass.constructor.apply(self, arguments);
            
            return 0;
        }
        
        $.inherit(Slide, Switchable,{
        	_init:function() {
                var self = this;
                Slide.superclass._init.call(self);
        	}
        });
        Slide.Config={
        	effect:'scrollx',
            autoplay: true
        };
        
        return Slide;
    })();
    
    
    
    
    var Tab = (function(){
    	 /**
         * Tab Class
         * @constructor
         */
        function Tab(container, config) {
        	
            var self = this;

            // factory or constructor
            if (!(self instanceof Tab)) {
                return new Tab(container, config);
            }
            Tab.superclass.constructor.apply(self, arguments);

            return 0;
        }
        
        $.inherit(Tab,Switchable,{
        });
        Tab.Config={
        	effect:'none',
            autoplay: false
        };
        
        return Tab;
    })();
   
    
    var Carousel = (function(){
    	 /**
         * Carousel Class
         * @constructor
         */
        function Carousel(container, config) {
        	
            var self = this;

            // factory or constructor
            if (!(self instanceof Carousel)) {
                return new Carousel(container, config);
            }

            // call super
            Carousel.superclass.constructor.apply(self, arguments);
        }

        Carousel.Config = {
        	effect:'scrolly',
            circular: false,
            autoplay: true,
            prevBtnCls: CLS_PREFIX + 'prev-btn',
            nextBtnCls: CLS_PREFIX + 'next-btn',
            disableBtnCls: CLS_PREFIX + 'disable-btn'
        };

        Carousel.Plugins = [];

        $.inherit(Carousel, Switchable, {
            /**
             * 插入 carousel 的初始化逻辑
             *
             * Carousel 的初始化逻辑
             * 增加了:
             *   self.prevBtn
             *   self.nextBtn
             */
            _init:function() {
                var self = this;
                Carousel.superclass._init.call(self);
                var cfg = self.config, disableCls = cfg.disableBtnCls,
                    switching = false;
                
                
                
                // 获取 prev/next 按钮，并添加事件
                $.each(['prev', 'next'], function(i,d) {
                    var btn = self[d + 'Btn'] = $(DOT + cfg[d + 'BtnCls'], self.container)[0];
                    
                    if (!btn) return;
                    
                    $(btn).bind('click', function(ev) {
                        ev.preventDefault();
                        if (switching) return;
                        if (!$(btn).hasClass(disableCls)) {
                            self[d](DOM_EVENT);
                        }
                    });
                });

                // 注册 switch 事件，处理 prevBtn/nextBtn 的 disable 状态
                // circular = true 时，无需处理
                if (!cfg.circular) {
                    $.fnbind(self,'beforeSwitch', function() {
                        switching = true;
                    });
                    $.fnbind(self,'switch', function(ev) {
                        var i = ev.currentIndex,
                            disableBtn = (i === 0) ? self[PREV_BTN]
                                : (i === self.length - 1) ? self[NEXT_BTN]
                                : undefined;

                        $([self[PREV_BTN], self[NEXT_BTN]]).removeClass(disableCls);
                        if (disableBtn) $(disableBtn).addClass(disableCls);

                        switching = false;
                    });
                }
                
                
                // 触发 itemSelected 事件
                $(self.panels).bind('click', function() {
                    $(self).trigger('itemSelected', { item: this });
                });
            }
        });
        
        return Carousel;
    })();
   
    
    /**
     * 拓展至jQuery
     */
    $.extend({
    	Widget:function(hook){
    		var c = [];
        	hook = '.' + (hook || 'J_Widget');
        	
            $(hook).each(function() {
            	var elem = this,
            	type = $(elem).data('widget-type'), config;
            	
                if (type && ('Switchable Carousel Tab Slide'.indexOf(type) > -1)) {
                    try {
                        config = $(elem).data('widget-config');
                        if (config) config = config.replace(/'/g, '"');
                        c.push(new $.Widget[type](elem, $.parseJSON(config)));
                    } catch(ex) {
                        $.error('J_Widget: ' + ex);
                    }
                }
            });
            return c;
        }
    });
    
    $.extend($.Widget,{
		'Switchable':Switchable,
		'Slide':Slide,
		'Carousel':Carousel,
		'Tab':Tab
	});
    
    /**
     * jQuery 实例对象拓展
     */
    $.each(['Switchable','Carousel','Tab','Slide'],function(i,v){
    	var w = {};
    	w[v] = function(cfg){
    		var c = [];
    		$(this).each(function(){
    			c.push(new $.Widget[v](this,cfg));
    		});
    		return c;
    	};
    	$.fn.extend(w);
    });
    
    
    
    //window.Slide = Slide;
    //window.Switchable = Switchable;
})(window,jQuery);
