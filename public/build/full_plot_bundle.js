
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var full = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
            'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        const crossorigin = is_crossorigin();
        let unsubscribe;
        if (crossorigin) {
            iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
            iframe.src = 'about:blank';
            iframe.onload = () => {
                unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            };
        }
        append(node, iframe);
        return () => {
            if (crossorigin) {
                unsubscribe();
            }
            else if (unsubscribe && iframe.contentWindow) {
                unsubscribe();
            }
            detach(iframe);
        };
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const toString = Object.prototype.toString;

    function isAnyArray(object) {
      return toString.call(object).endsWith('Array]');
    }

    function max(input) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (!isAnyArray(input)) {
        throw new TypeError('input must be an array');
      }

      if (input.length === 0) {
        throw new TypeError('input must not be empty');
      }

      var _options$fromIndex = options.fromIndex,
          fromIndex = _options$fromIndex === void 0 ? 0 : _options$fromIndex,
          _options$toIndex = options.toIndex,
          toIndex = _options$toIndex === void 0 ? input.length : _options$toIndex;

      if (fromIndex < 0 || fromIndex >= input.length || !Number.isInteger(fromIndex)) {
        throw new Error('fromIndex must be a positive integer smaller than length');
      }

      if (toIndex <= fromIndex || toIndex > input.length || !Number.isInteger(toIndex)) {
        throw new Error('toIndex must be an integer greater than fromIndex and at most equal to length');
      }

      var maxValue = input[fromIndex];

      for (var i = fromIndex + 1; i < toIndex; i++) {
        if (input[i] > maxValue) maxValue = input[i];
      }

      return maxValue;
    }

    function min$1(input) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (!isAnyArray(input)) {
        throw new TypeError('input must be an array');
      }

      if (input.length === 0) {
        throw new TypeError('input must not be empty');
      }

      var _options$fromIndex = options.fromIndex,
          fromIndex = _options$fromIndex === void 0 ? 0 : _options$fromIndex,
          _options$toIndex = options.toIndex,
          toIndex = _options$toIndex === void 0 ? input.length : _options$toIndex;

      if (fromIndex < 0 || fromIndex >= input.length || !Number.isInteger(fromIndex)) {
        throw new Error('fromIndex must be a positive integer smaller than length');
      }

      if (toIndex <= fromIndex || toIndex > input.length || !Number.isInteger(toIndex)) {
        throw new Error('toIndex must be an integer greater than fromIndex and at most equal to length');
      }

      var minValue = input[fromIndex];

      for (var i = fromIndex + 1; i < toIndex; i++) {
        if (input[i] < minValue) minValue = input[i];
      }

      return minValue;
    }

    function rescale(input) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (!isAnyArray(input)) {
        throw new TypeError('input must be an array');
      } else if (input.length === 0) {
        throw new TypeError('input must not be empty');
      }

      var output;

      if (options.output !== undefined) {
        if (!isAnyArray(options.output)) {
          throw new TypeError('output option must be an array if specified');
        }

        output = options.output;
      } else {
        output = new Array(input.length);
      }

      var currentMin = min$1(input);
      var currentMax = max(input);

      if (currentMin === currentMax) {
        throw new RangeError('minimum and maximum input values are equal. Cannot rescale a constant array');
      }

      var _options$min = options.min,
          minValue = _options$min === void 0 ? options.autoMinMax ? currentMin : 0 : _options$min,
          _options$max = options.max,
          maxValue = _options$max === void 0 ? options.autoMinMax ? currentMax : 1 : _options$max;

      if (minValue >= maxValue) {
        throw new RangeError('min option must be smaller than max option');
      }

      var factor = (maxValue - minValue) / (currentMax - currentMin);

      for (var i = 0; i < input.length; i++) {
        output[i] = (input[i] - currentMin) * factor + minValue;
      }

      return output;
    }

    /**
     * @class LuDecomposition
     * @link https://github.com/lutzroeder/Mapack/blob/master/Source/LuDecomposition.cs
     * @param {Matrix} matrix
     */
    class LuDecomposition {
      constructor(matrix) {
        matrix = WrapperMatrix2D.checkMatrix(matrix);

        var lu = matrix.clone();
        var rows = lu.rows;
        var columns = lu.columns;
        var pivotVector = new Array(rows);
        var pivotSign = 1;
        var i, j, k, p, s, t, v;
        var LUcolj, kmax;

        for (i = 0; i < rows; i++) {
          pivotVector[i] = i;
        }

        LUcolj = new Array(rows);

        for (j = 0; j < columns; j++) {
          for (i = 0; i < rows; i++) {
            LUcolj[i] = lu.get(i, j);
          }

          for (i = 0; i < rows; i++) {
            kmax = Math.min(i, j);
            s = 0;
            for (k = 0; k < kmax; k++) {
              s += lu.get(i, k) * LUcolj[k];
            }
            LUcolj[i] -= s;
            lu.set(i, j, LUcolj[i]);
          }

          p = j;
          for (i = j + 1; i < rows; i++) {
            if (Math.abs(LUcolj[i]) > Math.abs(LUcolj[p])) {
              p = i;
            }
          }

          if (p !== j) {
            for (k = 0; k < columns; k++) {
              t = lu.get(p, k);
              lu.set(p, k, lu.get(j, k));
              lu.set(j, k, t);
            }

            v = pivotVector[p];
            pivotVector[p] = pivotVector[j];
            pivotVector[j] = v;

            pivotSign = -pivotSign;
          }

          if (j < rows && lu.get(j, j) !== 0) {
            for (i = j + 1; i < rows; i++) {
              lu.set(i, j, lu.get(i, j) / lu.get(j, j));
            }
          }
        }

        this.LU = lu;
        this.pivotVector = pivotVector;
        this.pivotSign = pivotSign;
      }

      /**
       *
       * @return {boolean}
       */
      isSingular() {
        var data = this.LU;
        var col = data.columns;
        for (var j = 0; j < col; j++) {
          if (data[j][j] === 0) {
            return true;
          }
        }
        return false;
      }

      /**
       *
       * @param {Matrix} value
       * @return {Matrix}
       */
      solve(value) {
        value = Matrix.checkMatrix(value);

        var lu = this.LU;
        var rows = lu.rows;

        if (rows !== value.rows) {
          throw new Error('Invalid matrix dimensions');
        }
        if (this.isSingular()) {
          throw new Error('LU matrix is singular');
        }

        var count = value.columns;
        var X = value.subMatrixRow(this.pivotVector, 0, count - 1);
        var columns = lu.columns;
        var i, j, k;

        for (k = 0; k < columns; k++) {
          for (i = k + 1; i < columns; i++) {
            for (j = 0; j < count; j++) {
              X[i][j] -= X[k][j] * lu[i][k];
            }
          }
        }
        for (k = columns - 1; k >= 0; k--) {
          for (j = 0; j < count; j++) {
            X[k][j] /= lu[k][k];
          }
          for (i = 0; i < k; i++) {
            for (j = 0; j < count; j++) {
              X[i][j] -= X[k][j] * lu[i][k];
            }
          }
        }
        return X;
      }

      /**
       *
       * @return {number}
       */
      get determinant() {
        var data = this.LU;
        if (!data.isSquare()) {
          throw new Error('Matrix must be square');
        }
        var determinant = this.pivotSign;
        var col = data.columns;
        for (var j = 0; j < col; j++) {
          determinant *= data[j][j];
        }
        return determinant;
      }

      /**
       *
       * @return {Matrix}
       */
      get lowerTriangularMatrix() {
        var data = this.LU;
        var rows = data.rows;
        var columns = data.columns;
        var X = new Matrix(rows, columns);
        for (var i = 0; i < rows; i++) {
          for (var j = 0; j < columns; j++) {
            if (i > j) {
              X[i][j] = data[i][j];
            } else if (i === j) {
              X[i][j] = 1;
            } else {
              X[i][j] = 0;
            }
          }
        }
        return X;
      }

      /**
       *
       * @return {Matrix}
       */
      get upperTriangularMatrix() {
        var data = this.LU;
        var rows = data.rows;
        var columns = data.columns;
        var X = new Matrix(rows, columns);
        for (var i = 0; i < rows; i++) {
          for (var j = 0; j < columns; j++) {
            if (i <= j) {
              X[i][j] = data[i][j];
            } else {
              X[i][j] = 0;
            }
          }
        }
        return X;
      }

      /**
       *
       * @return {Array<number>}
       */
      get pivotPermutationVector() {
        return this.pivotVector.slice();
      }
    }

    function hypotenuse(a, b) {
      var r = 0;
      if (Math.abs(a) > Math.abs(b)) {
        r = b / a;
        return Math.abs(a) * Math.sqrt(1 + r * r);
      }
      if (b !== 0) {
        r = a / b;
        return Math.abs(b) * Math.sqrt(1 + r * r);
      }
      return 0;
    }

    function getFilled2DArray(rows, columns, value) {
      var array = new Array(rows);
      for (var i = 0; i < rows; i++) {
        array[i] = new Array(columns);
        for (var j = 0; j < columns; j++) {
          array[i][j] = value;
        }
      }
      return array;
    }

    /**
     * @class SingularValueDecomposition
     * @see https://github.com/accord-net/framework/blob/development/Sources/Accord.Math/Decompositions/SingularValueDecomposition.cs
     * @param {Matrix} value
     * @param {object} [options]
     * @param {boolean} [options.computeLeftSingularVectors=true]
     * @param {boolean} [options.computeRightSingularVectors=true]
     * @param {boolean} [options.autoTranspose=false]
     */
    class SingularValueDecomposition {
      constructor(value, options = {}) {
        value = WrapperMatrix2D.checkMatrix(value);

        var m = value.rows;
        var n = value.columns;

        const {
          computeLeftSingularVectors = true,
          computeRightSingularVectors = true,
          autoTranspose = false
        } = options;

        var wantu = Boolean(computeLeftSingularVectors);
        var wantv = Boolean(computeRightSingularVectors);

        var swapped = false;
        var a;
        if (m < n) {
          if (!autoTranspose) {
            a = value.clone();
            // eslint-disable-next-line no-console
            console.warn(
              'Computing SVD on a matrix with more columns than rows. Consider enabling autoTranspose'
            );
          } else {
            a = value.transpose();
            m = a.rows;
            n = a.columns;
            swapped = true;
            var aux = wantu;
            wantu = wantv;
            wantv = aux;
          }
        } else {
          a = value.clone();
        }

        var nu = Math.min(m, n);
        var ni = Math.min(m + 1, n);
        var s = new Array(ni);
        var U = getFilled2DArray(m, nu, 0);
        var V = getFilled2DArray(n, n, 0);

        var e = new Array(n);
        var work = new Array(m);

        var si = new Array(ni);
        for (let i = 0; i < ni; i++) si[i] = i;

        var nct = Math.min(m - 1, n);
        var nrt = Math.max(0, Math.min(n - 2, m));
        var mrc = Math.max(nct, nrt);

        for (let k = 0; k < mrc; k++) {
          if (k < nct) {
            s[k] = 0;
            for (let i = k; i < m; i++) {
              s[k] = hypotenuse(s[k], a[i][k]);
            }
            if (s[k] !== 0) {
              if (a[k][k] < 0) {
                s[k] = -s[k];
              }
              for (let i = k; i < m; i++) {
                a[i][k] /= s[k];
              }
              a[k][k] += 1;
            }
            s[k] = -s[k];
          }

          for (let j = k + 1; j < n; j++) {
            if (k < nct && s[k] !== 0) {
              let t = 0;
              for (let i = k; i < m; i++) {
                t += a[i][k] * a[i][j];
              }
              t = -t / a[k][k];
              for (let i = k; i < m; i++) {
                a[i][j] += t * a[i][k];
              }
            }
            e[j] = a[k][j];
          }

          if (wantu && k < nct) {
            for (let i = k; i < m; i++) {
              U[i][k] = a[i][k];
            }
          }

          if (k < nrt) {
            e[k] = 0;
            for (let i = k + 1; i < n; i++) {
              e[k] = hypotenuse(e[k], e[i]);
            }
            if (e[k] !== 0) {
              if (e[k + 1] < 0) {
                e[k] = 0 - e[k];
              }
              for (let i = k + 1; i < n; i++) {
                e[i] /= e[k];
              }
              e[k + 1] += 1;
            }
            e[k] = -e[k];
            if (k + 1 < m && e[k] !== 0) {
              for (let i = k + 1; i < m; i++) {
                work[i] = 0;
              }
              for (let i = k + 1; i < m; i++) {
                for (let j = k + 1; j < n; j++) {
                  work[i] += e[j] * a[i][j];
                }
              }
              for (let j = k + 1; j < n; j++) {
                let t = -e[j] / e[k + 1];
                for (let i = k + 1; i < m; i++) {
                  a[i][j] += t * work[i];
                }
              }
            }
            if (wantv) {
              for (let i = k + 1; i < n; i++) {
                V[i][k] = e[i];
              }
            }
          }
        }

        let p = Math.min(n, m + 1);
        if (nct < n) {
          s[nct] = a[nct][nct];
        }
        if (m < p) {
          s[p - 1] = 0;
        }
        if (nrt + 1 < p) {
          e[nrt] = a[nrt][p - 1];
        }
        e[p - 1] = 0;

        if (wantu) {
          for (let j = nct; j < nu; j++) {
            for (let i = 0; i < m; i++) {
              U[i][j] = 0;
            }
            U[j][j] = 1;
          }
          for (let k = nct - 1; k >= 0; k--) {
            if (s[k] !== 0) {
              for (let j = k + 1; j < nu; j++) {
                let t = 0;
                for (let i = k; i < m; i++) {
                  t += U[i][k] * U[i][j];
                }
                t = -t / U[k][k];
                for (let i = k; i < m; i++) {
                  U[i][j] += t * U[i][k];
                }
              }
              for (let i = k; i < m; i++) {
                U[i][k] = -U[i][k];
              }
              U[k][k] = 1 + U[k][k];
              for (let i = 0; i < k - 1; i++) {
                U[i][k] = 0;
              }
            } else {
              for (let i = 0; i < m; i++) {
                U[i][k] = 0;
              }
              U[k][k] = 1;
            }
          }
        }

        if (wantv) {
          for (let k = n - 1; k >= 0; k--) {
            if (k < nrt && e[k] !== 0) {
              for (let j = k + 1; j < n; j++) {
                let t = 0;
                for (let i = k + 1; i < n; i++) {
                  t += V[i][k] * V[i][j];
                }
                t = -t / V[k + 1][k];
                for (let i = k + 1; i < n; i++) {
                  V[i][j] += t * V[i][k];
                }
              }
            }
            for (let i = 0; i < n; i++) {
              V[i][k] = 0;
            }
            V[k][k] = 1;
          }
        }

        var pp = p - 1;
        var eps = Number.EPSILON;
        while (p > 0) {
          let k, kase;
          for (k = p - 2; k >= -1; k--) {
            if (k === -1) {
              break;
            }
            const alpha =
              Number.MIN_VALUE + eps * Math.abs(s[k] + Math.abs(s[k + 1]));
            if (Math.abs(e[k]) <= alpha || Number.isNaN(e[k])) {
              e[k] = 0;
              break;
            }
          }
          if (k === p - 2) {
            kase = 4;
          } else {
            let ks;
            for (ks = p - 1; ks >= k; ks--) {
              if (ks === k) {
                break;
              }
              let t =
                (ks !== p ? Math.abs(e[ks]) : 0) +
                (ks !== k + 1 ? Math.abs(e[ks - 1]) : 0);
              if (Math.abs(s[ks]) <= eps * t) {
                s[ks] = 0;
                break;
              }
            }
            if (ks === k) {
              kase = 3;
            } else if (ks === p - 1) {
              kase = 1;
            } else {
              kase = 2;
              k = ks;
            }
          }

          k++;

          switch (kase) {
            case 1: {
              let f = e[p - 2];
              e[p - 2] = 0;
              for (let j = p - 2; j >= k; j--) {
                let t = hypotenuse(s[j], f);
                let cs = s[j] / t;
                let sn = f / t;
                s[j] = t;
                if (j !== k) {
                  f = -sn * e[j - 1];
                  e[j - 1] = cs * e[j - 1];
                }
                if (wantv) {
                  for (let i = 0; i < n; i++) {
                    t = cs * V[i][j] + sn * V[i][p - 1];
                    V[i][p - 1] = -sn * V[i][j] + cs * V[i][p - 1];
                    V[i][j] = t;
                  }
                }
              }
              break;
            }
            case 2: {
              let f = e[k - 1];
              e[k - 1] = 0;
              for (let j = k; j < p; j++) {
                let t = hypotenuse(s[j], f);
                let cs = s[j] / t;
                let sn = f / t;
                s[j] = t;
                f = -sn * e[j];
                e[j] = cs * e[j];
                if (wantu) {
                  for (let i = 0; i < m; i++) {
                    t = cs * U[i][j] + sn * U[i][k - 1];
                    U[i][k - 1] = -sn * U[i][j] + cs * U[i][k - 1];
                    U[i][j] = t;
                  }
                }
              }
              break;
            }
            case 3: {
              const scale = Math.max(
                Math.abs(s[p - 1]),
                Math.abs(s[p - 2]),
                Math.abs(e[p - 2]),
                Math.abs(s[k]),
                Math.abs(e[k])
              );
              const sp = s[p - 1] / scale;
              const spm1 = s[p - 2] / scale;
              const epm1 = e[p - 2] / scale;
              const sk = s[k] / scale;
              const ek = e[k] / scale;
              const b = ((spm1 + sp) * (spm1 - sp) + epm1 * epm1) / 2;
              const c = sp * epm1 * (sp * epm1);
              let shift = 0;
              if (b !== 0 || c !== 0) {
                if (b < 0) {
                  shift = 0 - Math.sqrt(b * b + c);
                } else {
                  shift = Math.sqrt(b * b + c);
                }
                shift = c / (b + shift);
              }
              let f = (sk + sp) * (sk - sp) + shift;
              let g = sk * ek;
              for (let j = k; j < p - 1; j++) {
                let t = hypotenuse(f, g);
                if (t === 0) t = Number.MIN_VALUE;
                let cs = f / t;
                let sn = g / t;
                if (j !== k) {
                  e[j - 1] = t;
                }
                f = cs * s[j] + sn * e[j];
                e[j] = cs * e[j] - sn * s[j];
                g = sn * s[j + 1];
                s[j + 1] = cs * s[j + 1];
                if (wantv) {
                  for (let i = 0; i < n; i++) {
                    t = cs * V[i][j] + sn * V[i][j + 1];
                    V[i][j + 1] = -sn * V[i][j] + cs * V[i][j + 1];
                    V[i][j] = t;
                  }
                }
                t = hypotenuse(f, g);
                if (t === 0) t = Number.MIN_VALUE;
                cs = f / t;
                sn = g / t;
                s[j] = t;
                f = cs * e[j] + sn * s[j + 1];
                s[j + 1] = -sn * e[j] + cs * s[j + 1];
                g = sn * e[j + 1];
                e[j + 1] = cs * e[j + 1];
                if (wantu && j < m - 1) {
                  for (let i = 0; i < m; i++) {
                    t = cs * U[i][j] + sn * U[i][j + 1];
                    U[i][j + 1] = -sn * U[i][j] + cs * U[i][j + 1];
                    U[i][j] = t;
                  }
                }
              }
              e[p - 2] = f;
              break;
            }
            case 4: {
              if (s[k] <= 0) {
                s[k] = s[k] < 0 ? -s[k] : 0;
                if (wantv) {
                  for (let i = 0; i <= pp; i++) {
                    V[i][k] = -V[i][k];
                  }
                }
              }
              while (k < pp) {
                if (s[k] >= s[k + 1]) {
                  break;
                }
                let t = s[k];
                s[k] = s[k + 1];
                s[k + 1] = t;
                if (wantv && k < n - 1) {
                  for (let i = 0; i < n; i++) {
                    t = V[i][k + 1];
                    V[i][k + 1] = V[i][k];
                    V[i][k] = t;
                  }
                }
                if (wantu && k < m - 1) {
                  for (let i = 0; i < m; i++) {
                    t = U[i][k + 1];
                    U[i][k + 1] = U[i][k];
                    U[i][k] = t;
                  }
                }
                k++;
              }
              p--;
              break;
            }
            // no default
          }
        }

        if (swapped) {
          var tmp = V;
          V = U;
          U = tmp;
        }

        this.m = m;
        this.n = n;
        this.s = s;
        this.U = U;
        this.V = V;
      }

      /**
       * Solve a problem of least square (Ax=b) by using the SVD. Useful when A is singular. When A is not singular, it would be better to use qr.solve(value).
       * Example : We search to approximate x, with A matrix shape m*n, x vector size n, b vector size m (m > n). We will use :
       * var svd = SingularValueDecomposition(A);
       * var x = svd.solve(b);
       * @param {Matrix} value - Matrix 1D which is the vector b (in the equation Ax = b)
       * @return {Matrix} - The vector x
       */
      solve(value) {
        var Y = value;
        var e = this.threshold;
        var scols = this.s.length;
        var Ls = Matrix.zeros(scols, scols);

        for (let i = 0; i < scols; i++) {
          if (Math.abs(this.s[i]) <= e) {
            Ls[i][i] = 0;
          } else {
            Ls[i][i] = 1 / this.s[i];
          }
        }

        var U = this.U;
        var V = this.rightSingularVectors;

        var VL = V.mmul(Ls);
        var vrows = V.rows;
        var urows = U.length;
        var VLU = Matrix.zeros(vrows, urows);

        for (let i = 0; i < vrows; i++) {
          for (let j = 0; j < urows; j++) {
            let sum = 0;
            for (let k = 0; k < scols; k++) {
              sum += VL[i][k] * U[j][k];
            }
            VLU[i][j] = sum;
          }
        }

        return VLU.mmul(Y);
      }

      /**
       *
       * @param {Array<number>} value
       * @return {Matrix}
       */
      solveForDiagonal(value) {
        return this.solve(Matrix.diag(value));
      }

      /**
       * Get the inverse of the matrix. We compute the inverse of a matrix using SVD when this matrix is singular or ill-conditioned. Example :
       * var svd = SingularValueDecomposition(A);
       * var inverseA = svd.inverse();
       * @return {Matrix} - The approximation of the inverse of the matrix
       */
      inverse() {
        var V = this.V;
        var e = this.threshold;
        var vrows = V.length;
        var vcols = V[0].length;
        var X = new Matrix(vrows, this.s.length);

        for (let i = 0; i < vrows; i++) {
          for (let j = 0; j < vcols; j++) {
            if (Math.abs(this.s[j]) > e) {
              X[i][j] = V[i][j] / this.s[j];
            } else {
              X[i][j] = 0;
            }
          }
        }

        var U = this.U;

        var urows = U.length;
        var ucols = U[0].length;
        var Y = new Matrix(vrows, urows);

        for (let i = 0; i < vrows; i++) {
          for (let j = 0; j < urows; j++) {
            let sum = 0;
            for (let k = 0; k < ucols; k++) {
              sum += X[i][k] * U[j][k];
            }
            Y[i][j] = sum;
          }
        }

        return Y;
      }

      /**
       *
       * @return {number}
       */
      get condition() {
        return this.s[0] / this.s[Math.min(this.m, this.n) - 1];
      }

      /**
       *
       * @return {number}
       */
      get norm2() {
        return this.s[0];
      }

      /**
       *
       * @return {number}
       */
      get rank() {
        var tol = Math.max(this.m, this.n) * this.s[0] * Number.EPSILON;
        var r = 0;
        var s = this.s;
        for (var i = 0, ii = s.length; i < ii; i++) {
          if (s[i] > tol) {
            r++;
          }
        }
        return r;
      }

      /**
       *
       * @return {Array<number>}
       */
      get diagonal() {
        return this.s;
      }

      /**
       *
       * @return {number}
       */
      get threshold() {
        return Number.EPSILON / 2 * Math.max(this.m, this.n) * this.s[0];
      }

      /**
       *
       * @return {Matrix}
       */
      get leftSingularVectors() {
        if (!Matrix.isMatrix(this.U)) {
          this.U = new Matrix(this.U);
        }
        return this.U;
      }

      /**
       *
       * @return {Matrix}
       */
      get rightSingularVectors() {
        if (!Matrix.isMatrix(this.V)) {
          this.V = new Matrix(this.V);
        }
        return this.V;
      }

      /**
       *
       * @return {Matrix}
       */
      get diagonalMatrix() {
        return Matrix.diag(this.s);
      }
    }

    /**
     * @private
     * Check that a row index is not out of bounds
     * @param {Matrix} matrix
     * @param {number} index
     * @param {boolean} [outer]
     */
    function checkRowIndex(matrix, index, outer) {
      var max = outer ? matrix.rows : matrix.rows - 1;
      if (index < 0 || index > max) {
        throw new RangeError('Row index out of range');
      }
    }

    /**
     * @private
     * Check that a column index is not out of bounds
     * @param {Matrix} matrix
     * @param {number} index
     * @param {boolean} [outer]
     */
    function checkColumnIndex(matrix, index, outer) {
      var max = outer ? matrix.columns : matrix.columns - 1;
      if (index < 0 || index > max) {
        throw new RangeError('Column index out of range');
      }
    }

    /**
     * @private
     * Check that the provided vector is an array with the right length
     * @param {Matrix} matrix
     * @param {Array|Matrix} vector
     * @return {Array}
     * @throws {RangeError}
     */
    function checkRowVector(matrix, vector) {
      if (vector.to1DArray) {
        vector = vector.to1DArray();
      }
      if (vector.length !== matrix.columns) {
        throw new RangeError(
          'vector size must be the same as the number of columns'
        );
      }
      return vector;
    }

    /**
     * @private
     * Check that the provided vector is an array with the right length
     * @param {Matrix} matrix
     * @param {Array|Matrix} vector
     * @return {Array}
     * @throws {RangeError}
     */
    function checkColumnVector(matrix, vector) {
      if (vector.to1DArray) {
        vector = vector.to1DArray();
      }
      if (vector.length !== matrix.rows) {
        throw new RangeError('vector size must be the same as the number of rows');
      }
      return vector;
    }

    function checkIndices(matrix, rowIndices, columnIndices) {
      return {
        row: checkRowIndices(matrix, rowIndices),
        column: checkColumnIndices(matrix, columnIndices)
      };
    }

    function checkRowIndices(matrix, rowIndices) {
      if (typeof rowIndices !== 'object') {
        throw new TypeError('unexpected type for row indices');
      }

      var rowOut = rowIndices.some((r) => {
        return r < 0 || r >= matrix.rows;
      });

      if (rowOut) {
        throw new RangeError('row indices are out of range');
      }

      if (!Array.isArray(rowIndices)) rowIndices = Array.from(rowIndices);

      return rowIndices;
    }

    function checkColumnIndices(matrix, columnIndices) {
      if (typeof columnIndices !== 'object') {
        throw new TypeError('unexpected type for column indices');
      }

      var columnOut = columnIndices.some((c) => {
        return c < 0 || c >= matrix.columns;
      });

      if (columnOut) {
        throw new RangeError('column indices are out of range');
      }
      if (!Array.isArray(columnIndices)) columnIndices = Array.from(columnIndices);

      return columnIndices;
    }

    function checkRange(matrix, startRow, endRow, startColumn, endColumn) {
      if (arguments.length !== 5) {
        throw new RangeError('expected 4 arguments');
      }
      checkNumber('startRow', startRow);
      checkNumber('endRow', endRow);
      checkNumber('startColumn', startColumn);
      checkNumber('endColumn', endColumn);
      if (
        startRow > endRow ||
        startColumn > endColumn ||
        startRow < 0 ||
        startRow >= matrix.rows ||
        endRow < 0 ||
        endRow >= matrix.rows ||
        startColumn < 0 ||
        startColumn >= matrix.columns ||
        endColumn < 0 ||
        endColumn >= matrix.columns
      ) {
        throw new RangeError('Submatrix indices are out of range');
      }
    }

    function sumByRow(matrix) {
      var sum = Matrix.zeros(matrix.rows, 1);
      for (var i = 0; i < matrix.rows; ++i) {
        for (var j = 0; j < matrix.columns; ++j) {
          sum.set(i, 0, sum.get(i, 0) + matrix.get(i, j));
        }
      }
      return sum;
    }

    function sumByColumn(matrix) {
      var sum = Matrix.zeros(1, matrix.columns);
      for (var i = 0; i < matrix.rows; ++i) {
        for (var j = 0; j < matrix.columns; ++j) {
          sum.set(0, j, sum.get(0, j) + matrix.get(i, j));
        }
      }
      return sum;
    }

    function sumAll(matrix) {
      var v = 0;
      for (var i = 0; i < matrix.rows; i++) {
        for (var j = 0; j < matrix.columns; j++) {
          v += matrix.get(i, j);
        }
      }
      return v;
    }

    function checkNumber(name, value) {
      if (typeof value !== 'number') {
        throw new TypeError(`${name} must be a number`);
      }
    }

    class BaseView extends AbstractMatrix() {
      constructor(matrix, rows, columns) {
        super();
        this.matrix = matrix;
        this.rows = rows;
        this.columns = columns;
      }

      static get [Symbol.species]() {
        return Matrix;
      }
    }

    class MatrixTransposeView extends BaseView {
      constructor(matrix) {
        super(matrix, matrix.columns, matrix.rows);
      }

      set(rowIndex, columnIndex, value) {
        this.matrix.set(columnIndex, rowIndex, value);
        return this;
      }

      get(rowIndex, columnIndex) {
        return this.matrix.get(columnIndex, rowIndex);
      }
    }

    class MatrixRowView extends BaseView {
      constructor(matrix, row) {
        super(matrix, 1, matrix.columns);
        this.row = row;
      }

      set(rowIndex, columnIndex, value) {
        this.matrix.set(this.row, columnIndex, value);
        return this;
      }

      get(rowIndex, columnIndex) {
        return this.matrix.get(this.row, columnIndex);
      }
    }

    class MatrixSubView extends BaseView {
      constructor(matrix, startRow, endRow, startColumn, endColumn) {
        checkRange(matrix, startRow, endRow, startColumn, endColumn);
        super(matrix, endRow - startRow + 1, endColumn - startColumn + 1);
        this.startRow = startRow;
        this.startColumn = startColumn;
      }

      set(rowIndex, columnIndex, value) {
        this.matrix.set(
          this.startRow + rowIndex,
          this.startColumn + columnIndex,
          value
        );
        return this;
      }

      get(rowIndex, columnIndex) {
        return this.matrix.get(
          this.startRow + rowIndex,
          this.startColumn + columnIndex
        );
      }
    }

    class MatrixSelectionView extends BaseView {
      constructor(matrix, rowIndices, columnIndices) {
        var indices = checkIndices(matrix, rowIndices, columnIndices);
        super(matrix, indices.row.length, indices.column.length);
        this.rowIndices = indices.row;
        this.columnIndices = indices.column;
      }

      set(rowIndex, columnIndex, value) {
        this.matrix.set(
          this.rowIndices[rowIndex],
          this.columnIndices[columnIndex],
          value
        );
        return this;
      }

      get(rowIndex, columnIndex) {
        return this.matrix.get(
          this.rowIndices[rowIndex],
          this.columnIndices[columnIndex]
        );
      }
    }

    class MatrixRowSelectionView extends BaseView {
      constructor(matrix, rowIndices) {
        rowIndices = checkRowIndices(matrix, rowIndices);
        super(matrix, rowIndices.length, matrix.columns);
        this.rowIndices = rowIndices;
      }

      set(rowIndex, columnIndex, value) {
        this.matrix.set(this.rowIndices[rowIndex], columnIndex, value);
        return this;
      }

      get(rowIndex, columnIndex) {
        return this.matrix.get(this.rowIndices[rowIndex], columnIndex);
      }
    }

    class MatrixColumnSelectionView extends BaseView {
      constructor(matrix, columnIndices) {
        columnIndices = checkColumnIndices(matrix, columnIndices);
        super(matrix, matrix.rows, columnIndices.length);
        this.columnIndices = columnIndices;
      }

      set(rowIndex, columnIndex, value) {
        this.matrix.set(rowIndex, this.columnIndices[columnIndex], value);
        return this;
      }

      get(rowIndex, columnIndex) {
        return this.matrix.get(rowIndex, this.columnIndices[columnIndex]);
      }
    }

    class MatrixColumnView extends BaseView {
      constructor(matrix, column) {
        super(matrix, matrix.rows, 1);
        this.column = column;
      }

      set(rowIndex, columnIndex, value) {
        this.matrix.set(rowIndex, this.column, value);
        return this;
      }

      get(rowIndex) {
        return this.matrix.get(rowIndex, this.column);
      }
    }

    class MatrixFlipRowView extends BaseView {
      constructor(matrix) {
        super(matrix, matrix.rows, matrix.columns);
      }

      set(rowIndex, columnIndex, value) {
        this.matrix.set(this.rows - rowIndex - 1, columnIndex, value);
        return this;
      }

      get(rowIndex, columnIndex) {
        return this.matrix.get(this.rows - rowIndex - 1, columnIndex);
      }
    }

    class MatrixFlipColumnView extends BaseView {
      constructor(matrix) {
        super(matrix, matrix.rows, matrix.columns);
      }

      set(rowIndex, columnIndex, value) {
        this.matrix.set(rowIndex, this.columns - columnIndex - 1, value);
        return this;
      }

      get(rowIndex, columnIndex) {
        return this.matrix.get(rowIndex, this.columns - columnIndex - 1);
      }
    }

    function AbstractMatrix(superCtor) {
      if (superCtor === undefined) superCtor = Object;

      /**
       * Real matrix
       * @class Matrix
       * @param {number|Array|Matrix} nRows - Number of rows of the new matrix,
       * 2D array containing the data or Matrix instance to clone
       * @param {number} [nColumns] - Number of columns of the new matrix
       */
      class Matrix extends superCtor {
        static get [Symbol.species]() {
          return this;
        }

        /**
         * Constructs a Matrix with the chosen dimensions from a 1D array
         * @param {number} newRows - Number of rows
         * @param {number} newColumns - Number of columns
         * @param {Array} newData - A 1D array containing data for the matrix
         * @return {Matrix} - The new matrix
         */
        static from1DArray(newRows, newColumns, newData) {
          var length = newRows * newColumns;
          if (length !== newData.length) {
            throw new RangeError('Data length does not match given dimensions');
          }
          var newMatrix = new this(newRows, newColumns);
          for (var row = 0; row < newRows; row++) {
            for (var column = 0; column < newColumns; column++) {
              newMatrix.set(row, column, newData[row * newColumns + column]);
            }
          }
          return newMatrix;
        }

        /**
             * Creates a row vector, a matrix with only one row.
             * @param {Array} newData - A 1D array containing data for the vector
             * @return {Matrix} - The new matrix
             */
        static rowVector(newData) {
          var vector = new this(1, newData.length);
          for (var i = 0; i < newData.length; i++) {
            vector.set(0, i, newData[i]);
          }
          return vector;
        }

        /**
             * Creates a column vector, a matrix with only one column.
             * @param {Array} newData - A 1D array containing data for the vector
             * @return {Matrix} - The new matrix
             */
        static columnVector(newData) {
          var vector = new this(newData.length, 1);
          for (var i = 0; i < newData.length; i++) {
            vector.set(i, 0, newData[i]);
          }
          return vector;
        }

        /**
             * Creates an empty matrix with the given dimensions. Values will be undefined. Same as using new Matrix(rows, columns).
             * @param {number} rows - Number of rows
             * @param {number} columns - Number of columns
             * @return {Matrix} - The new matrix
             */
        static empty(rows, columns) {
          return new this(rows, columns);
        }

        /**
             * Creates a matrix with the given dimensions. Values will be set to zero.
             * @param {number} rows - Number of rows
             * @param {number} columns - Number of columns
             * @return {Matrix} - The new matrix
             */
        static zeros(rows, columns) {
          return this.empty(rows, columns).fill(0);
        }

        /**
             * Creates a matrix with the given dimensions. Values will be set to one.
             * @param {number} rows - Number of rows
             * @param {number} columns - Number of columns
             * @return {Matrix} - The new matrix
             */
        static ones(rows, columns) {
          return this.empty(rows, columns).fill(1);
        }

        /**
             * Creates a matrix with the given dimensions. Values will be randomly set.
             * @param {number} rows - Number of rows
             * @param {number} columns - Number of columns
             * @param {function} [rng=Math.random] - Random number generator
             * @return {Matrix} The new matrix
             */
        static rand(rows, columns, rng) {
          if (rng === undefined) rng = Math.random;
          var matrix = this.empty(rows, columns);
          for (var i = 0; i < rows; i++) {
            for (var j = 0; j < columns; j++) {
              matrix.set(i, j, rng());
            }
          }
          return matrix;
        }

        /**
             * Creates a matrix with the given dimensions. Values will be random integers.
             * @param {number} rows - Number of rows
             * @param {number} columns - Number of columns
             * @param {number} [maxValue=1000] - Maximum value
             * @param {function} [rng=Math.random] - Random number generator
             * @return {Matrix} The new matrix
             */
        static randInt(rows, columns, maxValue, rng) {
          if (maxValue === undefined) maxValue = 1000;
          if (rng === undefined) rng = Math.random;
          var matrix = this.empty(rows, columns);
          for (var i = 0; i < rows; i++) {
            for (var j = 0; j < columns; j++) {
              var value = Math.floor(rng() * maxValue);
              matrix.set(i, j, value);
            }
          }
          return matrix;
        }

        /**
             * Creates an identity matrix with the given dimension. Values of the diagonal will be 1 and others will be 0.
             * @param {number} rows - Number of rows
             * @param {number} [columns=rows] - Number of columns
             * @param {number} [value=1] - Value to fill the diagonal with
             * @return {Matrix} - The new identity matrix
             */
        static eye(rows, columns, value) {
          if (columns === undefined) columns = rows;
          if (value === undefined) value = 1;
          var min = Math.min(rows, columns);
          var matrix = this.zeros(rows, columns);
          for (var i = 0; i < min; i++) {
            matrix.set(i, i, value);
          }
          return matrix;
        }

        /**
             * Creates a diagonal matrix based on the given array.
             * @param {Array} data - Array containing the data for the diagonal
             * @param {number} [rows] - Number of rows (Default: data.length)
             * @param {number} [columns] - Number of columns (Default: rows)
             * @return {Matrix} - The new diagonal matrix
             */
        static diag(data, rows, columns) {
          var l = data.length;
          if (rows === undefined) rows = l;
          if (columns === undefined) columns = rows;
          var min = Math.min(l, rows, columns);
          var matrix = this.zeros(rows, columns);
          for (var i = 0; i < min; i++) {
            matrix.set(i, i, data[i]);
          }
          return matrix;
        }

        /**
             * Returns a matrix whose elements are the minimum between matrix1 and matrix2
             * @param {Matrix} matrix1
             * @param {Matrix} matrix2
             * @return {Matrix}
             */
        static min(matrix1, matrix2) {
          matrix1 = this.checkMatrix(matrix1);
          matrix2 = this.checkMatrix(matrix2);
          var rows = matrix1.rows;
          var columns = matrix1.columns;
          var result = new this(rows, columns);
          for (var i = 0; i < rows; i++) {
            for (var j = 0; j < columns; j++) {
              result.set(i, j, Math.min(matrix1.get(i, j), matrix2.get(i, j)));
            }
          }
          return result;
        }

        /**
             * Returns a matrix whose elements are the maximum between matrix1 and matrix2
             * @param {Matrix} matrix1
             * @param {Matrix} matrix2
             * @return {Matrix}
             */
        static max(matrix1, matrix2) {
          matrix1 = this.checkMatrix(matrix1);
          matrix2 = this.checkMatrix(matrix2);
          var rows = matrix1.rows;
          var columns = matrix1.columns;
          var result = new this(rows, columns);
          for (var i = 0; i < rows; i++) {
            for (var j = 0; j < columns; j++) {
              result.set(i, j, Math.max(matrix1.get(i, j), matrix2.get(i, j)));
            }
          }
          return result;
        }

        /**
             * Check that the provided value is a Matrix and tries to instantiate one if not
             * @param {*} value - The value to check
             * @return {Matrix}
             */
        static checkMatrix(value) {
          return Matrix.isMatrix(value) ? value : new this(value);
        }

        /**
             * Returns true if the argument is a Matrix, false otherwise
             * @param {*} value - The value to check
             * @return {boolean}
             */
        static isMatrix(value) {
          return (value != null) && (value.klass === 'Matrix');
        }

        /**
             * @prop {number} size - The number of elements in the matrix.
             */
        get size() {
          return this.rows * this.columns;
        }

        /**
             * Applies a callback for each element of the matrix. The function is called in the matrix (this) context.
             * @param {function} callback - Function that will be called with two parameters : i (row) and j (column)
             * @return {Matrix} this
             */
        apply(callback) {
          if (typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
          }
          var ii = this.rows;
          var jj = this.columns;
          for (var i = 0; i < ii; i++) {
            for (var j = 0; j < jj; j++) {
              callback.call(this, i, j);
            }
          }
          return this;
        }

        /**
             * Returns a new 1D array filled row by row with the matrix values
             * @return {Array}
             */
        to1DArray() {
          var array = new Array(this.size);
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              array[i * this.columns + j] = this.get(i, j);
            }
          }
          return array;
        }

        /**
             * Returns a 2D array containing a copy of the data
             * @return {Array}
             */
        to2DArray() {
          var copy = new Array(this.rows);
          for (var i = 0; i < this.rows; i++) {
            copy[i] = new Array(this.columns);
            for (var j = 0; j < this.columns; j++) {
              copy[i][j] = this.get(i, j);
            }
          }
          return copy;
        }

        /**
             * @return {boolean} true if the matrix has one row
             */
        isRowVector() {
          return this.rows === 1;
        }

        /**
             * @return {boolean} true if the matrix has one column
             */
        isColumnVector() {
          return this.columns === 1;
        }

        /**
             * @return {boolean} true if the matrix has one row or one column
             */
        isVector() {
          return (this.rows === 1) || (this.columns === 1);
        }

        /**
             * @return {boolean} true if the matrix has the same number of rows and columns
             */
        isSquare() {
          return this.rows === this.columns;
        }

        /**
             * @return {boolean} true if the matrix is square and has the same values on both sides of the diagonal
             */
        isSymmetric() {
          if (this.isSquare()) {
            for (var i = 0; i < this.rows; i++) {
              for (var j = 0; j <= i; j++) {
                if (this.get(i, j) !== this.get(j, i)) {
                  return false;
                }
              }
            }
            return true;
          }
          return false;
        }

        /**
              * @return true if the matrix is in echelon form
              */
        isEchelonForm() {
          let i = 0;
          let j = 0;
          let previousColumn = -1;
          let isEchelonForm = true;
          let checked = false;
          while ((i < this.rows) && (isEchelonForm)) {
            j = 0;
            checked = false;
            while ((j < this.columns) && (checked === false)) {
              if (this.get(i, j) === 0) {
                j++;
              } else if ((this.get(i, j) === 1) && (j > previousColumn)) {
                checked = true;
                previousColumn = j;
              } else {
                isEchelonForm = false;
                checked = true;
              }
            }
            i++;
          }
          return isEchelonForm;
        }

        /**
                 * @return true if the matrix is in reduced echelon form
                 */
        isReducedEchelonForm() {
          let i = 0;
          let j = 0;
          let previousColumn = -1;
          let isReducedEchelonForm = true;
          let checked = false;
          while ((i < this.rows) && (isReducedEchelonForm)) {
            j = 0;
            checked = false;
            while ((j < this.columns) && (checked === false)) {
              if (this.get(i, j) === 0) {
                j++;
              } else if ((this.get(i, j) === 1) && (j > previousColumn)) {
                checked = true;
                previousColumn = j;
              } else {
                isReducedEchelonForm = false;
                checked = true;
              }
            }
            for (let k = j + 1; k < this.rows; k++) {
              if (this.get(i, k) !== 0) {
                isReducedEchelonForm = false;
              }
            }
            i++;
          }
          return isReducedEchelonForm;
        }

        /**
             * Sets a given element of the matrix. mat.set(3,4,1) is equivalent to mat[3][4]=1
             * @abstract
             * @param {number} rowIndex - Index of the row
             * @param {number} columnIndex - Index of the column
             * @param {number} value - The new value for the element
             * @return {Matrix} this
             */
        set(rowIndex, columnIndex, value) { // eslint-disable-line no-unused-vars
          throw new Error('set method is unimplemented');
        }

        /**
             * Returns the given element of the matrix. mat.get(3,4) is equivalent to matrix[3][4]
             * @abstract
             * @param {number} rowIndex - Index of the row
             * @param {number} columnIndex - Index of the column
             * @return {number}
             */
        get(rowIndex, columnIndex) { // eslint-disable-line no-unused-vars
          throw new Error('get method is unimplemented');
        }

        /**
             * Creates a new matrix that is a repetition of the current matrix. New matrix has rowRep times the number of
             * rows of the matrix, and colRep times the number of columns of the matrix
             * @param {number} rowRep - Number of times the rows should be repeated
             * @param {number} colRep - Number of times the columns should be re
             * @return {Matrix}
             * @example
             * var matrix = new Matrix([[1,2]]);
             * matrix.repeat(2); // [[1,2],[1,2]]
             */
        repeat(rowRep, colRep) {
          rowRep = rowRep || 1;
          colRep = colRep || 1;
          var matrix = new this.constructor[Symbol.species](this.rows * rowRep, this.columns * colRep);
          for (var i = 0; i < rowRep; i++) {
            for (var j = 0; j < colRep; j++) {
              matrix.setSubMatrix(this, this.rows * i, this.columns * j);
            }
          }
          return matrix;
        }

        /**
             * Fills the matrix with a given value. All elements will be set to this value.
             * @param {number} value - New value
             * @return {Matrix} this
             */
        fill(value) {
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              this.set(i, j, value);
            }
          }
          return this;
        }

        /**
             * Negates the matrix. All elements will be multiplied by (-1)
             * @return {Matrix} this
             */
        neg() {
          return this.mulS(-1);
        }

        /**
             * Returns a new array from the given row index
             * @param {number} index - Row index
             * @return {Array}
             */
        getRow(index) {
          checkRowIndex(this, index);
          var row = new Array(this.columns);
          for (var i = 0; i < this.columns; i++) {
            row[i] = this.get(index, i);
          }
          return row;
        }

        /**
             * Returns a new row vector from the given row index
             * @param {number} index - Row index
             * @return {Matrix}
             */
        getRowVector(index) {
          return this.constructor.rowVector(this.getRow(index));
        }

        /**
             * Sets a row at the given index
             * @param {number} index - Row index
             * @param {Array|Matrix} array - Array or vector
             * @return {Matrix} this
             */
        setRow(index, array) {
          checkRowIndex(this, index);
          array = checkRowVector(this, array);
          for (var i = 0; i < this.columns; i++) {
            this.set(index, i, array[i]);
          }
          return this;
        }

        /**
             * Swaps two rows
             * @param {number} row1 - First row index
             * @param {number} row2 - Second row index
             * @return {Matrix} this
             */
        swapRows(row1, row2) {
          checkRowIndex(this, row1);
          checkRowIndex(this, row2);
          for (var i = 0; i < this.columns; i++) {
            var temp = this.get(row1, i);
            this.set(row1, i, this.get(row2, i));
            this.set(row2, i, temp);
          }
          return this;
        }

        /**
             * Returns a new array from the given column index
             * @param {number} index - Column index
             * @return {Array}
             */
        getColumn(index) {
          checkColumnIndex(this, index);
          var column = new Array(this.rows);
          for (var i = 0; i < this.rows; i++) {
            column[i] = this.get(i, index);
          }
          return column;
        }

        /**
             * Returns a new column vector from the given column index
             * @param {number} index - Column index
             * @return {Matrix}
             */
        getColumnVector(index) {
          return this.constructor.columnVector(this.getColumn(index));
        }

        /**
             * Sets a column at the given index
             * @param {number} index - Column index
             * @param {Array|Matrix} array - Array or vector
             * @return {Matrix} this
             */
        setColumn(index, array) {
          checkColumnIndex(this, index);
          array = checkColumnVector(this, array);
          for (var i = 0; i < this.rows; i++) {
            this.set(i, index, array[i]);
          }
          return this;
        }

        /**
             * Swaps two columns
             * @param {number} column1 - First column index
             * @param {number} column2 - Second column index
             * @return {Matrix} this
             */
        swapColumns(column1, column2) {
          checkColumnIndex(this, column1);
          checkColumnIndex(this, column2);
          for (var i = 0; i < this.rows; i++) {
            var temp = this.get(i, column1);
            this.set(i, column1, this.get(i, column2));
            this.set(i, column2, temp);
          }
          return this;
        }

        /**
             * Adds the values of a vector to each row
             * @param {Array|Matrix} vector - Array or vector
             * @return {Matrix} this
             */
        addRowVector(vector) {
          vector = checkRowVector(this, vector);
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) + vector[j]);
            }
          }
          return this;
        }

        /**
             * Subtracts the values of a vector from each row
             * @param {Array|Matrix} vector - Array or vector
             * @return {Matrix} this
             */
        subRowVector(vector) {
          vector = checkRowVector(this, vector);
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) - vector[j]);
            }
          }
          return this;
        }

        /**
             * Multiplies the values of a vector with each row
             * @param {Array|Matrix} vector - Array or vector
             * @return {Matrix} this
             */
        mulRowVector(vector) {
          vector = checkRowVector(this, vector);
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) * vector[j]);
            }
          }
          return this;
        }

        /**
             * Divides the values of each row by those of a vector
             * @param {Array|Matrix} vector - Array or vector
             * @return {Matrix} this
             */
        divRowVector(vector) {
          vector = checkRowVector(this, vector);
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) / vector[j]);
            }
          }
          return this;
        }

        /**
             * Adds the values of a vector to each column
             * @param {Array|Matrix} vector - Array or vector
             * @return {Matrix} this
             */
        addColumnVector(vector) {
          vector = checkColumnVector(this, vector);
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) + vector[i]);
            }
          }
          return this;
        }

        /**
             * Subtracts the values of a vector from each column
             * @param {Array|Matrix} vector - Array or vector
             * @return {Matrix} this
             */
        subColumnVector(vector) {
          vector = checkColumnVector(this, vector);
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) - vector[i]);
            }
          }
          return this;
        }

        /**
             * Multiplies the values of a vector with each column
             * @param {Array|Matrix} vector - Array or vector
             * @return {Matrix} this
             */
        mulColumnVector(vector) {
          vector = checkColumnVector(this, vector);
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) * vector[i]);
            }
          }
          return this;
        }

        /**
             * Divides the values of each column by those of a vector
             * @param {Array|Matrix} vector - Array or vector
             * @return {Matrix} this
             */
        divColumnVector(vector) {
          vector = checkColumnVector(this, vector);
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) / vector[i]);
            }
          }
          return this;
        }

        /**
             * Multiplies the values of a row with a scalar
             * @param {number} index - Row index
             * @param {number} value
             * @return {Matrix} this
             */
        mulRow(index, value) {
          checkRowIndex(this, index);
          for (var i = 0; i < this.columns; i++) {
            this.set(index, i, this.get(index, i) * value);
          }
          return this;
        }

        /**
             * Multiplies the values of a column with a scalar
             * @param {number} index - Column index
             * @param {number} value
             * @return {Matrix} this
             */
        mulColumn(index, value) {
          checkColumnIndex(this, index);
          for (var i = 0; i < this.rows; i++) {
            this.set(i, index, this.get(i, index) * value);
          }
          return this;
        }

        /**
             * Returns the maximum value of the matrix
             * @return {number}
             */
        max() {
          var v = this.get(0, 0);
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              if (this.get(i, j) > v) {
                v = this.get(i, j);
              }
            }
          }
          return v;
        }

        /**
             * Returns the index of the maximum value
             * @return {Array}
             */
        maxIndex() {
          var v = this.get(0, 0);
          var idx = [0, 0];
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              if (this.get(i, j) > v) {
                v = this.get(i, j);
                idx[0] = i;
                idx[1] = j;
              }
            }
          }
          return idx;
        }

        /**
             * Returns the minimum value of the matrix
             * @return {number}
             */
        min() {
          var v = this.get(0, 0);
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              if (this.get(i, j) < v) {
                v = this.get(i, j);
              }
            }
          }
          return v;
        }

        /**
             * Returns the index of the minimum value
             * @return {Array}
             */
        minIndex() {
          var v = this.get(0, 0);
          var idx = [0, 0];
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              if (this.get(i, j) < v) {
                v = this.get(i, j);
                idx[0] = i;
                idx[1] = j;
              }
            }
          }
          return idx;
        }

        /**
             * Returns the maximum value of one row
             * @param {number} row - Row index
             * @return {number}
             */
        maxRow(row) {
          checkRowIndex(this, row);
          var v = this.get(row, 0);
          for (var i = 1; i < this.columns; i++) {
            if (this.get(row, i) > v) {
              v = this.get(row, i);
            }
          }
          return v;
        }

        /**
             * Returns the index of the maximum value of one row
             * @param {number} row - Row index
             * @return {Array}
             */
        maxRowIndex(row) {
          checkRowIndex(this, row);
          var v = this.get(row, 0);
          var idx = [row, 0];
          for (var i = 1; i < this.columns; i++) {
            if (this.get(row, i) > v) {
              v = this.get(row, i);
              idx[1] = i;
            }
          }
          return idx;
        }

        /**
             * Returns the minimum value of one row
             * @param {number} row - Row index
             * @return {number}
             */
        minRow(row) {
          checkRowIndex(this, row);
          var v = this.get(row, 0);
          for (var i = 1; i < this.columns; i++) {
            if (this.get(row, i) < v) {
              v = this.get(row, i);
            }
          }
          return v;
        }

        /**
             * Returns the index of the maximum value of one row
             * @param {number} row - Row index
             * @return {Array}
             */
        minRowIndex(row) {
          checkRowIndex(this, row);
          var v = this.get(row, 0);
          var idx = [row, 0];
          for (var i = 1; i < this.columns; i++) {
            if (this.get(row, i) < v) {
              v = this.get(row, i);
              idx[1] = i;
            }
          }
          return idx;
        }

        /**
             * Returns the maximum value of one column
             * @param {number} column - Column index
             * @return {number}
             */
        maxColumn(column) {
          checkColumnIndex(this, column);
          var v = this.get(0, column);
          for (var i = 1; i < this.rows; i++) {
            if (this.get(i, column) > v) {
              v = this.get(i, column);
            }
          }
          return v;
        }

        /**
             * Returns the index of the maximum value of one column
             * @param {number} column - Column index
             * @return {Array}
             */
        maxColumnIndex(column) {
          checkColumnIndex(this, column);
          var v = this.get(0, column);
          var idx = [0, column];
          for (var i = 1; i < this.rows; i++) {
            if (this.get(i, column) > v) {
              v = this.get(i, column);
              idx[0] = i;
            }
          }
          return idx;
        }

        /**
             * Returns the minimum value of one column
             * @param {number} column - Column index
             * @return {number}
             */
        minColumn(column) {
          checkColumnIndex(this, column);
          var v = this.get(0, column);
          for (var i = 1; i < this.rows; i++) {
            if (this.get(i, column) < v) {
              v = this.get(i, column);
            }
          }
          return v;
        }

        /**
             * Returns the index of the minimum value of one column
             * @param {number} column - Column index
             * @return {Array}
             */
        minColumnIndex(column) {
          checkColumnIndex(this, column);
          var v = this.get(0, column);
          var idx = [0, column];
          for (var i = 1; i < this.rows; i++) {
            if (this.get(i, column) < v) {
              v = this.get(i, column);
              idx[0] = i;
            }
          }
          return idx;
        }

        /**
             * Returns an array containing the diagonal values of the matrix
             * @return {Array}
             */
        diag() {
          var min = Math.min(this.rows, this.columns);
          var diag = new Array(min);
          for (var i = 0; i < min; i++) {
            diag[i] = this.get(i, i);
          }
          return diag;
        }

        /**
             * Returns the sum by the argument given, if no argument given,
             * it returns the sum of all elements of the matrix.
             * @param {string} by - sum by 'row' or 'column'.
             * @return {Matrix|number}
             */
        sum(by) {
          switch (by) {
            case 'row':
              return sumByRow(this);
            case 'column':
              return sumByColumn(this);
            default:
              return sumAll(this);
          }
        }

        /**
             * Returns the mean of all elements of the matrix
             * @return {number}
             */
        mean() {
          return this.sum() / this.size;
        }

        /**
             * Returns the product of all elements of the matrix
             * @return {number}
             */
        prod() {
          var prod = 1;
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              prod *= this.get(i, j);
            }
          }
          return prod;
        }

        /**
             * Returns the norm of a matrix.
             * @param {string} type - "frobenius" (default) or "max" return resp. the Frobenius norm and the max norm.
             * @return {number}
             */
        norm(type = 'frobenius') {
          var result = 0;
          if (type === 'max') {
            return this.max();
          } else if (type === 'frobenius') {
            for (var i = 0; i < this.rows; i++) {
              for (var j = 0; j < this.columns; j++) {
                result = result + this.get(i, j) * this.get(i, j);
              }
            }
            return Math.sqrt(result);
          } else {
            throw new RangeError(`unknown norm type: ${type}`);
          }
        }

        /**
             * Computes the cumulative sum of the matrix elements (in place, row by row)
             * @return {Matrix} this
             */
        cumulativeSum() {
          var sum = 0;
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              sum += this.get(i, j);
              this.set(i, j, sum);
            }
          }
          return this;
        }

        /**
             * Computes the dot (scalar) product between the matrix and another
             * @param {Matrix} vector2 vector
             * @return {number}
             */
        dot(vector2) {
          if (Matrix.isMatrix(vector2)) vector2 = vector2.to1DArray();
          var vector1 = this.to1DArray();
          if (vector1.length !== vector2.length) {
            throw new RangeError('vectors do not have the same size');
          }
          var dot = 0;
          for (var i = 0; i < vector1.length; i++) {
            dot += vector1[i] * vector2[i];
          }
          return dot;
        }

        /**
             * Returns the matrix product between this and other
             * @param {Matrix} other
             * @return {Matrix}
             */
        mmul(other) {
          other = this.constructor.checkMatrix(other);
          if (this.columns !== other.rows) {
            // eslint-disable-next-line no-console
            console.warn('Number of columns of left matrix are not equal to number of rows of right matrix.');
          }

          var m = this.rows;
          var n = this.columns;
          var p = other.columns;

          var result = new this.constructor[Symbol.species](m, p);

          var Bcolj = new Array(n);
          for (var j = 0; j < p; j++) {
            for (var k = 0; k < n; k++) {
              Bcolj[k] = other.get(k, j);
            }

            for (var i = 0; i < m; i++) {
              var s = 0;
              for (k = 0; k < n; k++) {
                s += this.get(i, k) * Bcolj[k];
              }

              result.set(i, j, s);
            }
          }
          return result;
        }

        strassen2x2(other) {
          var result = new this.constructor[Symbol.species](2, 2);
          const a11 = this.get(0, 0);
          const b11 = other.get(0, 0);
          const a12 = this.get(0, 1);
          const b12 = other.get(0, 1);
          const a21 = this.get(1, 0);
          const b21 = other.get(1, 0);
          const a22 = this.get(1, 1);
          const b22 = other.get(1, 1);

          // Compute intermediate values.
          const m1 = (a11 + a22) * (b11 + b22);
          const m2 = (a21 + a22) * b11;
          const m3 = a11 * (b12 - b22);
          const m4 = a22 * (b21 - b11);
          const m5 = (a11 + a12) * b22;
          const m6 = (a21 - a11) * (b11 + b12);
          const m7 = (a12 - a22) * (b21 + b22);

          // Combine intermediate values into the output.
          const c00 = m1 + m4 - m5 + m7;
          const c01 = m3 + m5;
          const c10 = m2 + m4;
          const c11 = m1 - m2 + m3 + m6;

          result.set(0, 0, c00);
          result.set(0, 1, c01);
          result.set(1, 0, c10);
          result.set(1, 1, c11);
          return result;
        }

        strassen3x3(other) {
          var result = new this.constructor[Symbol.species](3, 3);

          const a00 = this.get(0, 0);
          const a01 = this.get(0, 1);
          const a02 = this.get(0, 2);
          const a10 = this.get(1, 0);
          const a11 = this.get(1, 1);
          const a12 = this.get(1, 2);
          const a20 = this.get(2, 0);
          const a21 = this.get(2, 1);
          const a22 = this.get(2, 2);

          const b00 = other.get(0, 0);
          const b01 = other.get(0, 1);
          const b02 = other.get(0, 2);
          const b10 = other.get(1, 0);
          const b11 = other.get(1, 1);
          const b12 = other.get(1, 2);
          const b20 = other.get(2, 0);
          const b21 = other.get(2, 1);
          const b22 = other.get(2, 2);

          const m1 = (a00 + a01 + a02 - a10 - a11 - a21 - a22) * b11;
          const m2 = (a00 - a10) * (-b01 + b11);
          const m3 = a11 * (-b00 + b01 + b10 - b11 - b12 - b20 + b22);
          const m4 = (-a00 + a10 + a11) * (b00 - b01 + b11);
          const m5 = (a10 + a11) * (-b00 + b01);
          const m6 = a00 * b00;
          const m7 = (-a00 + a20 + a21) * (b00 - b02 + b12);
          const m8 = (-a00 + a20) * (b02 - b12);
          const m9 = (a20 + a21) * (-b00 + b02);
          const m10 = (a00 + a01 + a02 - a11 - a12 - a20 - a21) * b12;
          const m11 = a21 * (-b00 + b02 + b10 - b11 - b12 - b20 + b21);
          const m12 = (-a02 + a21 + a22) * (b11 + b20 - b21);
          const m13 = (a02 - a22) * (b11 - b21);
          const m14 = a02 * b20;
          const m15 = (a21 + a22) * (-b20 + b21);
          const m16 = (-a02 + a11 + a12) * (b12 + b20 - b22);
          const m17 = (a02 - a12) * (b12 - b22);
          const m18 = (a11 + a12) * (-b20 + b22);
          const m19 = a01 * b10;
          const m20 = a12 * b21;
          const m21 = a10 * b02;
          const m22 = a20 * b01;
          const m23 = a22 * b22;

          const c00 = m6 + m14 + m19;
          const c01 = m1 + m4 + m5 + m6 + m12 + m14 + m15;
          const c02 = m6 + m7 + m9 + m10 + m14 + m16 + m18;
          const c10 = m2 + m3 + m4 + m6 + m14 + m16 + m17;
          const c11 = m2 + m4 + m5 + m6 + m20;
          const c12 = m14 + m16 + m17 + m18 + m21;
          const c20 = m6 + m7 + m8 + m11 + m12 + m13 + m14;
          const c21 = m12 + m13 + m14 + m15 + m22;
          const c22 = m6 + m7 + m8 + m9 + m23;

          result.set(0, 0, c00);
          result.set(0, 1, c01);
          result.set(0, 2, c02);
          result.set(1, 0, c10);
          result.set(1, 1, c11);
          result.set(1, 2, c12);
          result.set(2, 0, c20);
          result.set(2, 1, c21);
          result.set(2, 2, c22);
          return result;
        }

        /**
             * Returns the matrix product between x and y. More efficient than mmul(other) only when we multiply squared matrix and when the size of the matrix is > 1000.
             * @param {Matrix} y
             * @return {Matrix}
             */
        mmulStrassen(y) {
          var x = this.clone();
          var r1 = x.rows;
          var c1 = x.columns;
          var r2 = y.rows;
          var c2 = y.columns;
          if (c1 !== r2) {
            // eslint-disable-next-line no-console
            console.warn(`Multiplying ${r1} x ${c1} and ${r2} x ${c2} matrix: dimensions do not match.`);
          }

          // Put a matrix into the top left of a matrix of zeros.
          // `rows` and `cols` are the dimensions of the output matrix.
          function embed(mat, rows, cols) {
            var r = mat.rows;
            var c = mat.columns;
            if ((r === rows) && (c === cols)) {
              return mat;
            } else {
              var resultat = Matrix.zeros(rows, cols);
              resultat = resultat.setSubMatrix(mat, 0, 0);
              return resultat;
            }
          }


          // Make sure both matrices are the same size.
          // This is exclusively for simplicity:
          // this algorithm can be implemented with matrices of different sizes.

          var r = Math.max(r1, r2);
          var c = Math.max(c1, c2);
          x = embed(x, r, c);
          y = embed(y, r, c);

          // Our recursive multiplication function.
          function blockMult(a, b, rows, cols) {
            // For small matrices, resort to naive multiplication.
            if (rows <= 512 || cols <= 512) {
              return a.mmul(b); // a is equivalent to this
            }

            // Apply dynamic padding.
            if ((rows % 2 === 1) && (cols % 2 === 1)) {
              a = embed(a, rows + 1, cols + 1);
              b = embed(b, rows + 1, cols + 1);
            } else if (rows % 2 === 1) {
              a = embed(a, rows + 1, cols);
              b = embed(b, rows + 1, cols);
            } else if (cols % 2 === 1) {
              a = embed(a, rows, cols + 1);
              b = embed(b, rows, cols + 1);
            }

            var halfRows = parseInt(a.rows / 2, 10);
            var halfCols = parseInt(a.columns / 2, 10);
            // Subdivide input matrices.
            var a11 = a.subMatrix(0, halfRows - 1, 0, halfCols - 1);
            var b11 = b.subMatrix(0, halfRows - 1, 0, halfCols - 1);

            var a12 = a.subMatrix(0, halfRows - 1, halfCols, a.columns - 1);
            var b12 = b.subMatrix(0, halfRows - 1, halfCols, b.columns - 1);

            var a21 = a.subMatrix(halfRows, a.rows - 1, 0, halfCols - 1);
            var b21 = b.subMatrix(halfRows, b.rows - 1, 0, halfCols - 1);

            var a22 = a.subMatrix(halfRows, a.rows - 1, halfCols, a.columns - 1);
            var b22 = b.subMatrix(halfRows, b.rows - 1, halfCols, b.columns - 1);

            // Compute intermediate values.
            var m1 = blockMult(Matrix.add(a11, a22), Matrix.add(b11, b22), halfRows, halfCols);
            var m2 = blockMult(Matrix.add(a21, a22), b11, halfRows, halfCols);
            var m3 = blockMult(a11, Matrix.sub(b12, b22), halfRows, halfCols);
            var m4 = blockMult(a22, Matrix.sub(b21, b11), halfRows, halfCols);
            var m5 = blockMult(Matrix.add(a11, a12), b22, halfRows, halfCols);
            var m6 = blockMult(Matrix.sub(a21, a11), Matrix.add(b11, b12), halfRows, halfCols);
            var m7 = blockMult(Matrix.sub(a12, a22), Matrix.add(b21, b22), halfRows, halfCols);

            // Combine intermediate values into the output.
            var c11 = Matrix.add(m1, m4);
            c11.sub(m5);
            c11.add(m7);
            var c12 = Matrix.add(m3, m5);
            var c21 = Matrix.add(m2, m4);
            var c22 = Matrix.sub(m1, m2);
            c22.add(m3);
            c22.add(m6);

            // Crop output to the desired size (undo dynamic padding).
            var resultat = Matrix.zeros(2 * c11.rows, 2 * c11.columns);
            resultat = resultat.setSubMatrix(c11, 0, 0);
            resultat = resultat.setSubMatrix(c12, c11.rows, 0);
            resultat = resultat.setSubMatrix(c21, 0, c11.columns);
            resultat = resultat.setSubMatrix(c22, c11.rows, c11.columns);
            return resultat.subMatrix(0, rows - 1, 0, cols - 1);
          }
          return blockMult(x, y, r, c);
        }

        /**
             * Returns a row-by-row scaled matrix
             * @param {number} [min=0] - Minimum scaled value
             * @param {number} [max=1] - Maximum scaled value
             * @return {Matrix} - The scaled matrix
             */
        scaleRows(min, max) {
          min = min === undefined ? 0 : min;
          max = max === undefined ? 1 : max;
          if (min >= max) {
            throw new RangeError('min should be strictly smaller than max');
          }
          var newMatrix = this.constructor.empty(this.rows, this.columns);
          for (var i = 0; i < this.rows; i++) {
            var scaled = rescale(this.getRow(i), { min, max });
            newMatrix.setRow(i, scaled);
          }
          return newMatrix;
        }

        /**
             * Returns a new column-by-column scaled matrix
             * @param {number} [min=0] - Minimum scaled value
             * @param {number} [max=1] - Maximum scaled value
             * @return {Matrix} - The new scaled matrix
             * @example
             * var matrix = new Matrix([[1,2],[-1,0]]);
             * var scaledMatrix = matrix.scaleColumns(); // [[1,1],[0,0]]
             */
        scaleColumns(min, max) {
          min = min === undefined ? 0 : min;
          max = max === undefined ? 1 : max;
          if (min >= max) {
            throw new RangeError('min should be strictly smaller than max');
          }
          var newMatrix = this.constructor.empty(this.rows, this.columns);
          for (var i = 0; i < this.columns; i++) {
            var scaled = rescale(this.getColumn(i), {
              min: min,
              max: max
            });
            newMatrix.setColumn(i, scaled);
          }
          return newMatrix;
        }


        /**
             * Returns the Kronecker product (also known as tensor product) between this and other
             * See https://en.wikipedia.org/wiki/Kronecker_product
             * @param {Matrix} other
             * @return {Matrix}
             */
        kroneckerProduct(other) {
          other = this.constructor.checkMatrix(other);

          var m = this.rows;
          var n = this.columns;
          var p = other.rows;
          var q = other.columns;

          var result = new this.constructor[Symbol.species](m * p, n * q);
          for (var i = 0; i < m; i++) {
            for (var j = 0; j < n; j++) {
              for (var k = 0; k < p; k++) {
                for (var l = 0; l < q; l++) {
                  result[p * i + k][q * j + l] = this.get(i, j) * other.get(k, l);
                }
              }
            }
          }
          return result;
        }

        /**
             * Transposes the matrix and returns a new one containing the result
             * @return {Matrix}
             */
        transpose() {
          var result = new this.constructor[Symbol.species](this.columns, this.rows);
          for (var i = 0; i < this.rows; i++) {
            for (var j = 0; j < this.columns; j++) {
              result.set(j, i, this.get(i, j));
            }
          }
          return result;
        }

        /**
             * Sorts the rows (in place)
             * @param {function} compareFunction - usual Array.prototype.sort comparison function
             * @return {Matrix} this
             */
        sortRows(compareFunction) {
          if (compareFunction === undefined) compareFunction = compareNumbers;
          for (var i = 0; i < this.rows; i++) {
            this.setRow(i, this.getRow(i).sort(compareFunction));
          }
          return this;
        }

        /**
             * Sorts the columns (in place)
             * @param {function} compareFunction - usual Array.prototype.sort comparison function
             * @return {Matrix} this
             */
        sortColumns(compareFunction) {
          if (compareFunction === undefined) compareFunction = compareNumbers;
          for (var i = 0; i < this.columns; i++) {
            this.setColumn(i, this.getColumn(i).sort(compareFunction));
          }
          return this;
        }

        /**
             * Returns a subset of the matrix
             * @param {number} startRow - First row index
             * @param {number} endRow - Last row index
             * @param {number} startColumn - First column index
             * @param {number} endColumn - Last column index
             * @return {Matrix}
             */
        subMatrix(startRow, endRow, startColumn, endColumn) {
          checkRange(this, startRow, endRow, startColumn, endColumn);
          var newMatrix = new this.constructor[Symbol.species](endRow - startRow + 1, endColumn - startColumn + 1);
          for (var i = startRow; i <= endRow; i++) {
            for (var j = startColumn; j <= endColumn; j++) {
              newMatrix[i - startRow][j - startColumn] = this.get(i, j);
            }
          }
          return newMatrix;
        }

        /**
             * Returns a subset of the matrix based on an array of row indices
             * @param {Array} indices - Array containing the row indices
             * @param {number} [startColumn = 0] - First column index
             * @param {number} [endColumn = this.columns-1] - Last column index
             * @return {Matrix}
             */
        subMatrixRow(indices, startColumn, endColumn) {
          if (startColumn === undefined) startColumn = 0;
          if (endColumn === undefined) endColumn = this.columns - 1;
          if ((startColumn > endColumn) || (startColumn < 0) || (startColumn >= this.columns) || (endColumn < 0) || (endColumn >= this.columns)) {
            throw new RangeError('Argument out of range');
          }

          var newMatrix = new this.constructor[Symbol.species](indices.length, endColumn - startColumn + 1);
          for (var i = 0; i < indices.length; i++) {
            for (var j = startColumn; j <= endColumn; j++) {
              if (indices[i] < 0 || indices[i] >= this.rows) {
                throw new RangeError(`Row index out of range: ${indices[i]}`);
              }
              newMatrix.set(i, j - startColumn, this.get(indices[i], j));
            }
          }
          return newMatrix;
        }

        /**
             * Returns a subset of the matrix based on an array of column indices
             * @param {Array} indices - Array containing the column indices
             * @param {number} [startRow = 0] - First row index
             * @param {number} [endRow = this.rows-1] - Last row index
             * @return {Matrix}
             */
        subMatrixColumn(indices, startRow, endRow) {
          if (startRow === undefined) startRow = 0;
          if (endRow === undefined) endRow = this.rows - 1;
          if ((startRow > endRow) || (startRow < 0) || (startRow >= this.rows) || (endRow < 0) || (endRow >= this.rows)) {
            throw new RangeError('Argument out of range');
          }

          var newMatrix = new this.constructor[Symbol.species](endRow - startRow + 1, indices.length);
          for (var i = 0; i < indices.length; i++) {
            for (var j = startRow; j <= endRow; j++) {
              if (indices[i] < 0 || indices[i] >= this.columns) {
                throw new RangeError(`Column index out of range: ${indices[i]}`);
              }
              newMatrix.set(j - startRow, i, this.get(j, indices[i]));
            }
          }
          return newMatrix;
        }

        /**
             * Set a part of the matrix to the given sub-matrix
             * @param {Matrix|Array< Array >} matrix - The source matrix from which to extract values.
             * @param {number} startRow - The index of the first row to set
             * @param {number} startColumn - The index of the first column to set
             * @return {Matrix}
             */
        setSubMatrix(matrix, startRow, startColumn) {
          matrix = this.constructor.checkMatrix(matrix);
          var endRow = startRow + matrix.rows - 1;
          var endColumn = startColumn + matrix.columns - 1;
          checkRange(this, startRow, endRow, startColumn, endColumn);
          for (var i = 0; i < matrix.rows; i++) {
            for (var j = 0; j < matrix.columns; j++) {
              this[startRow + i][startColumn + j] = matrix.get(i, j);
            }
          }
          return this;
        }

        /**
             * Return a new matrix based on a selection of rows and columns
             * @param {Array<number>} rowIndices - The row indices to select. Order matters and an index can be more than once.
             * @param {Array<number>} columnIndices - The column indices to select. Order matters and an index can be use more than once.
             * @return {Matrix} The new matrix
             */
        selection(rowIndices, columnIndices) {
          var indices = checkIndices(this, rowIndices, columnIndices);
          var newMatrix = new this.constructor[Symbol.species](rowIndices.length, columnIndices.length);
          for (var i = 0; i < indices.row.length; i++) {
            var rowIndex = indices.row[i];
            for (var j = 0; j < indices.column.length; j++) {
              var columnIndex = indices.column[j];
              newMatrix[i][j] = this.get(rowIndex, columnIndex);
            }
          }
          return newMatrix;
        }

        /**
             * Returns the trace of the matrix (sum of the diagonal elements)
             * @return {number}
             */
        trace() {
          var min = Math.min(this.rows, this.columns);
          var trace = 0;
          for (var i = 0; i < min; i++) {
            trace += this.get(i, i);
          }
          return trace;
        }

        /*
             Matrix views
             */

        /**
             * Returns a view of the transposition of the matrix
             * @return {MatrixTransposeView}
             */
        transposeView() {
          return new MatrixTransposeView(this);
        }

        /**
             * Returns a view of the row vector with the given index
             * @param {number} row - row index of the vector
             * @return {MatrixRowView}
             */
        rowView(row) {
          checkRowIndex(this, row);
          return new MatrixRowView(this, row);
        }

        /**
             * Returns a view of the column vector with the given index
             * @param {number} column - column index of the vector
             * @return {MatrixColumnView}
             */
        columnView(column) {
          checkColumnIndex(this, column);
          return new MatrixColumnView(this, column);
        }

        /**
             * Returns a view of the matrix flipped in the row axis
             * @return {MatrixFlipRowView}
             */
        flipRowView() {
          return new MatrixFlipRowView(this);
        }

        /**
             * Returns a view of the matrix flipped in the column axis
             * @return {MatrixFlipColumnView}
             */
        flipColumnView() {
          return new MatrixFlipColumnView(this);
        }

        /**
             * Returns a view of a submatrix giving the index boundaries
             * @param {number} startRow - first row index of the submatrix
             * @param {number} endRow - last row index of the submatrix
             * @param {number} startColumn - first column index of the submatrix
             * @param {number} endColumn - last column index of the submatrix
             * @return {MatrixSubView}
             */
        subMatrixView(startRow, endRow, startColumn, endColumn) {
          return new MatrixSubView(this, startRow, endRow, startColumn, endColumn);
        }

        /**
             * Returns a view of the cross of the row indices and the column indices
             * @example
             * // resulting vector is [[2], [2]]
             * var matrix = new Matrix([[1,2,3], [4,5,6]]).selectionView([0, 0], [1])
             * @param {Array<number>} rowIndices
             * @param {Array<number>} columnIndices
             * @return {MatrixSelectionView}
             */
        selectionView(rowIndices, columnIndices) {
          return new MatrixSelectionView(this, rowIndices, columnIndices);
        }

        /**
             * Returns a view of the row indices
             * @example
             * // resulting vector is [[1,2,3], [1,2,3]]
             * var matrix = new Matrix([[1,2,3], [4,5,6]]).rowSelectionView([0, 0])
             * @param {Array<number>} rowIndices
             * @return {MatrixRowSelectionView}
             */
        rowSelectionView(rowIndices) {
          return new MatrixRowSelectionView(this, rowIndices);
        }

        /**
             * Returns a view of the column indices
             * @example
             * // resulting vector is [[2, 2], [5, 5]]
             * var matrix = new Matrix([[1,2,3], [4,5,6]]).columnSelectionView([1, 1])
             * @param {Array<number>} columnIndices
             * @return {MatrixColumnSelectionView}
             */
        columnSelectionView(columnIndices) {
          return new MatrixColumnSelectionView(this, columnIndices);
        }


        /**
            * Calculates and returns the determinant of a matrix as a Number
            * @example
            *   new Matrix([[1,2,3], [4,5,6]]).det()
            * @return {number}
            */
        det() {
          if (this.isSquare()) {
            var a, b, c, d;
            if (this.columns === 2) {
              // 2 x 2 matrix
              a = this.get(0, 0);
              b = this.get(0, 1);
              c = this.get(1, 0);
              d = this.get(1, 1);

              return a * d - (b * c);
            } else if (this.columns === 3) {
              // 3 x 3 matrix
              var subMatrix0, subMatrix1, subMatrix2;
              subMatrix0 = this.selectionView([1, 2], [1, 2]);
              subMatrix1 = this.selectionView([1, 2], [0, 2]);
              subMatrix2 = this.selectionView([1, 2], [0, 1]);
              a = this.get(0, 0);
              b = this.get(0, 1);
              c = this.get(0, 2);

              return a * subMatrix0.det() - b * subMatrix1.det() + c * subMatrix2.det();
            } else {
              // general purpose determinant using the LU decomposition
              return new LuDecomposition(this).determinant;
            }
          } else {
            throw Error('Determinant can only be calculated for a square matrix.');
          }
        }

        /**
             * Returns inverse of a matrix if it exists or the pseudoinverse
             * @param {number} threshold - threshold for taking inverse of singular values (default = 1e-15)
             * @return {Matrix} the (pseudo)inverted matrix.
             */
        pseudoInverse(threshold) {
          if (threshold === undefined) threshold = Number.EPSILON;
          var svdSolution = new SingularValueDecomposition(this, { autoTranspose: true });

          var U = svdSolution.leftSingularVectors;
          var V = svdSolution.rightSingularVectors;
          var s = svdSolution.diagonal;

          for (var i = 0; i < s.length; i++) {
            if (Math.abs(s[i]) > threshold) {
              s[i] = 1.0 / s[i];
            } else {
              s[i] = 0.0;
            }
          }

          // convert list to diagonal
          s = this.constructor[Symbol.species].diag(s);
          return V.mmul(s.mmul(U.transposeView()));
        }

        /**
             * Creates an exact and independent copy of the matrix
             * @return {Matrix}
             */
        clone() {
          var newMatrix = new this.constructor[Symbol.species](this.rows, this.columns);
          for (var row = 0; row < this.rows; row++) {
            for (var column = 0; column < this.columns; column++) {
              newMatrix.set(row, column, this.get(row, column));
            }
          }
          return newMatrix;
        }
      }

      Matrix.prototype.klass = 'Matrix';

      function compareNumbers(a, b) {
        return a - b;
      }

      /*
         Synonyms
         */

      Matrix.random = Matrix.rand;
      Matrix.diagonal = Matrix.diag;
      Matrix.prototype.diagonal = Matrix.prototype.diag;
      Matrix.identity = Matrix.eye;
      Matrix.prototype.negate = Matrix.prototype.neg;
      Matrix.prototype.tensorProduct = Matrix.prototype.kroneckerProduct;
      Matrix.prototype.determinant = Matrix.prototype.det;

      /*
         Add dynamically instance and static methods for mathematical operations
         */

      var inplaceOperator = `
(function %name%(value) {
    if (typeof value === 'number') return this.%name%S(value);
    return this.%name%M(value);
})
`;

      var inplaceOperatorScalar = `
(function %name%S(value) {
    for (var i = 0; i < this.rows; i++) {
        for (var j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) %op% value);
        }
    }
    return this;
})
`;

      var inplaceOperatorMatrix = `
(function %name%M(matrix) {
    matrix = this.constructor.checkMatrix(matrix);
    if (this.rows !== matrix.rows ||
        this.columns !== matrix.columns) {
        throw new RangeError('Matrices dimensions must be equal');
    }
    for (var i = 0; i < this.rows; i++) {
        for (var j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) %op% matrix.get(i, j));
        }
    }
    return this;
})
`;

      var staticOperator = `
(function %name%(matrix, value) {
    var newMatrix = new this[Symbol.species](matrix);
    return newMatrix.%name%(value);
})
`;

      var inplaceMethod = `
(function %name%() {
    for (var i = 0; i < this.rows; i++) {
        for (var j = 0; j < this.columns; j++) {
            this.set(i, j, %method%(this.get(i, j)));
        }
    }
    return this;
})
`;

      var staticMethod = `
(function %name%(matrix) {
    var newMatrix = new this[Symbol.species](matrix);
    return newMatrix.%name%();
})
`;

      var inplaceMethodWithArgs = `
(function %name%(%args%) {
    for (var i = 0; i < this.rows; i++) {
        for (var j = 0; j < this.columns; j++) {
            this.set(i, j, %method%(this.get(i, j), %args%));
        }
    }
    return this;
})
`;

      var staticMethodWithArgs = `
(function %name%(matrix, %args%) {
    var newMatrix = new this[Symbol.species](matrix);
    return newMatrix.%name%(%args%);
})
`;


      var inplaceMethodWithOneArgScalar = `
(function %name%S(value) {
    for (var i = 0; i < this.rows; i++) {
        for (var j = 0; j < this.columns; j++) {
            this.set(i, j, %method%(this.get(i, j), value));
        }
    }
    return this;
})
`;
      var inplaceMethodWithOneArgMatrix = `
(function %name%M(matrix) {
    matrix = this.constructor.checkMatrix(matrix);
    if (this.rows !== matrix.rows ||
        this.columns !== matrix.columns) {
        throw new RangeError('Matrices dimensions must be equal');
    }
    for (var i = 0; i < this.rows; i++) {
        for (var j = 0; j < this.columns; j++) {
            this.set(i, j, %method%(this.get(i, j), matrix.get(i, j)));
        }
    }
    return this;
})
`;

      var inplaceMethodWithOneArg = `
(function %name%(value) {
    if (typeof value === 'number') return this.%name%S(value);
    return this.%name%M(value);
})
`;

      var staticMethodWithOneArg = staticMethodWithArgs;

      var operators = [
        // Arithmetic operators
        ['+', 'add'],
        ['-', 'sub', 'subtract'],
        ['*', 'mul', 'multiply'],
        ['/', 'div', 'divide'],
        ['%', 'mod', 'modulus'],
        // Bitwise operators
        ['&', 'and'],
        ['|', 'or'],
        ['^', 'xor'],
        ['<<', 'leftShift'],
        ['>>', 'signPropagatingRightShift'],
        ['>>>', 'rightShift', 'zeroFillRightShift']
      ];

      var i;
      var eval2 = eval; // eslint-disable-line no-eval
      for (var operator of operators) {
        var inplaceOp = eval2(fillTemplateFunction(inplaceOperator, { name: operator[1], op: operator[0] }));
        var inplaceOpS = eval2(fillTemplateFunction(inplaceOperatorScalar, { name: `${operator[1]}S`, op: operator[0] }));
        var inplaceOpM = eval2(fillTemplateFunction(inplaceOperatorMatrix, { name: `${operator[1]}M`, op: operator[0] }));
        var staticOp = eval2(fillTemplateFunction(staticOperator, { name: operator[1] }));
        for (i = 1; i < operator.length; i++) {
          Matrix.prototype[operator[i]] = inplaceOp;
          Matrix.prototype[`${operator[i]}S`] = inplaceOpS;
          Matrix.prototype[`${operator[i]}M`] = inplaceOpM;
          Matrix[operator[i]] = staticOp;
        }
      }

      var methods = [['~', 'not']];

      [
        'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atanh', 'cbrt', 'ceil',
        'clz32', 'cos', 'cosh', 'exp', 'expm1', 'floor', 'fround', 'log', 'log1p',
        'log10', 'log2', 'round', 'sign', 'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'trunc'
      ].forEach(function (mathMethod) {
        methods.push([`Math.${mathMethod}`, mathMethod]);
      });

      for (var method of methods) {
        var inplaceMeth = eval2(fillTemplateFunction(inplaceMethod, { name: method[1], method: method[0] }));
        var staticMeth = eval2(fillTemplateFunction(staticMethod, { name: method[1] }));
        for (i = 1; i < method.length; i++) {
          Matrix.prototype[method[i]] = inplaceMeth;
          Matrix[method[i]] = staticMeth;
        }
      }

      var methodsWithArgs = [['Math.pow', 1, 'pow']];

      for (var methodWithArg of methodsWithArgs) {
        var args = 'arg0';
        for (i = 1; i < methodWithArg[1]; i++) {
          args += `, arg${i}`;
        }
        if (methodWithArg[1] !== 1) {
          var inplaceMethWithArgs = eval2(fillTemplateFunction(inplaceMethodWithArgs, {
            name: methodWithArg[2],
            method: methodWithArg[0],
            args: args
          }));
          var staticMethWithArgs = eval2(fillTemplateFunction(staticMethodWithArgs, { name: methodWithArg[2], args: args }));
          for (i = 2; i < methodWithArg.length; i++) {
            Matrix.prototype[methodWithArg[i]] = inplaceMethWithArgs;
            Matrix[methodWithArg[i]] = staticMethWithArgs;
          }
        } else {
          var tmplVar = {
            name: methodWithArg[2],
            args: args,
            method: methodWithArg[0]
          };
          var inplaceMethod2 = eval2(fillTemplateFunction(inplaceMethodWithOneArg, tmplVar));
          var inplaceMethodS = eval2(fillTemplateFunction(inplaceMethodWithOneArgScalar, tmplVar));
          var inplaceMethodM = eval2(fillTemplateFunction(inplaceMethodWithOneArgMatrix, tmplVar));
          var staticMethod2 = eval2(fillTemplateFunction(staticMethodWithOneArg, tmplVar));
          for (i = 2; i < methodWithArg.length; i++) {
            Matrix.prototype[methodWithArg[i]] = inplaceMethod2;
            Matrix.prototype[`${methodWithArg[i]}M`] = inplaceMethodM;
            Matrix.prototype[`${methodWithArg[i]}S`] = inplaceMethodS;
            Matrix[methodWithArg[i]] = staticMethod2;
          }
        }
      }

      function fillTemplateFunction(template, values) {
        for (var value in values) {
          template = template.replace(new RegExp(`%${value}%`, 'g'), values[value]);
        }
        return template;
      }

      return Matrix;
    }

    class Matrix extends AbstractMatrix(Array) {
      constructor(nRows, nColumns) {
        var i;
        if (arguments.length === 1 && typeof nRows === 'number') {
          return new Array(nRows);
        }
        if (Matrix.isMatrix(nRows)) {
          return nRows.clone();
        } else if (Number.isInteger(nRows) && nRows > 0) {
          // Create an empty matrix
          super(nRows);
          if (Number.isInteger(nColumns) && nColumns > 0) {
            for (i = 0; i < nRows; i++) {
              this[i] = new Array(nColumns);
            }
          } else {
            throw new TypeError('nColumns must be a positive integer');
          }
        } else if (Array.isArray(nRows)) {
          // Copy the values from the 2D array
          const matrix = nRows;
          nRows = matrix.length;
          nColumns = matrix[0].length;
          if (typeof nColumns !== 'number' || nColumns === 0) {
            throw new TypeError(
              'Data must be a 2D array with at least one element'
            );
          }
          super(nRows);
          for (i = 0; i < nRows; i++) {
            if (matrix[i].length !== nColumns) {
              throw new RangeError('Inconsistent array dimensions');
            }
            this[i] = [].concat(matrix[i]);
          }
        } else {
          throw new TypeError(
            'First argument must be a positive number or an array'
          );
        }
        this.rows = nRows;
        this.columns = nColumns;
        return this;
      }

      set(rowIndex, columnIndex, value) {
        this[rowIndex][columnIndex] = value;
        return this;
      }

      get(rowIndex, columnIndex) {
        return this[rowIndex][columnIndex];
      }

      /**
       * Removes a row from the given index
       * @param {number} index - Row index
       * @return {Matrix} this
       */
      removeRow(index) {
        checkRowIndex(this, index);
        if (this.rows === 1) {
          throw new RangeError('A matrix cannot have less than one row');
        }
        this.splice(index, 1);
        this.rows -= 1;
        return this;
      }

      /**
       * Adds a row at the given index
       * @param {number} [index = this.rows] - Row index
       * @param {Array|Matrix} array - Array or vector
       * @return {Matrix} this
       */
      addRow(index, array) {
        if (array === undefined) {
          array = index;
          index = this.rows;
        }
        checkRowIndex(this, index, true);
        array = checkRowVector(this, array);
        this.splice(index, 0, array);
        this.rows += 1;
        return this;
      }

      /**
       * Removes a column from the given index
       * @param {number} index - Column index
       * @return {Matrix} this
       */
      removeColumn(index) {
        checkColumnIndex(this, index);
        if (this.columns === 1) {
          throw new RangeError('A matrix cannot have less than one column');
        }
        for (var i = 0; i < this.rows; i++) {
          this[i].splice(index, 1);
        }
        this.columns -= 1;
        return this;
      }

      /**
       * Adds a column at the given index
       * @param {number} [index = this.columns] - Column index
       * @param {Array|Matrix} array - Array or vector
       * @return {Matrix} this
       */
      addColumn(index, array) {
        if (typeof array === 'undefined') {
          array = index;
          index = this.columns;
        }
        checkColumnIndex(this, index, true);
        array = checkColumnVector(this, array);
        for (var i = 0; i < this.rows; i++) {
          this[i].splice(index, 0, array[i]);
        }
        this.columns += 1;
        return this;
      }
    }

    class WrapperMatrix1D extends AbstractMatrix() {
      /**
       * @class WrapperMatrix1D
       * @param {Array<number>} data
       * @param {object} [options]
       * @param {object} [options.rows = 1]
       */
      constructor(data, options = {}) {
        const { rows = 1 } = options;

        if (data.length % rows !== 0) {
          throw new Error('the data length is not divisible by the number of rows');
        }
        super();
        this.rows = rows;
        this.columns = data.length / rows;
        this.data = data;
      }

      set(rowIndex, columnIndex, value) {
        var index = this._calculateIndex(rowIndex, columnIndex);
        this.data[index] = value;
        return this;
      }

      get(rowIndex, columnIndex) {
        var index = this._calculateIndex(rowIndex, columnIndex);
        return this.data[index];
      }

      _calculateIndex(row, column) {
        return row * this.columns + column;
      }

      static get [Symbol.species]() {
        return Matrix;
      }
    }

    class WrapperMatrix2D extends AbstractMatrix() {
      /**
       * @class WrapperMatrix2D
       * @param {Array<Array<number>>} data
       */
      constructor(data) {
        super();
        this.data = data;
        this.rows = data.length;
        this.columns = data[0].length;
      }

      set(rowIndex, columnIndex, value) {
        this.data[rowIndex][columnIndex] = value;
        return this;
      }

      get(rowIndex, columnIndex) {
        return this.data[rowIndex][columnIndex];
      }

      static get [Symbol.species]() {
        return Matrix;
      }
    }

    /**
     * @class QrDecomposition
     * @link https://github.com/lutzroeder/Mapack/blob/master/Source/QrDecomposition.cs
     * @param {Matrix} value
     */
    class QrDecomposition {
      constructor(value) {
        value = WrapperMatrix2D.checkMatrix(value);

        var qr = value.clone();
        var m = value.rows;
        var n = value.columns;
        var rdiag = new Array(n);
        var i, j, k, s;

        for (k = 0; k < n; k++) {
          var nrm = 0;
          for (i = k; i < m; i++) {
            nrm = hypotenuse(nrm, qr.get(i, k));
          }
          if (nrm !== 0) {
            if (qr.get(k, k) < 0) {
              nrm = -nrm;
            }
            for (i = k; i < m; i++) {
              qr.set(i, k, qr.get(i, k) / nrm);
            }
            qr.set(k, k, qr.get(k, k) + 1);
            for (j = k + 1; j < n; j++) {
              s = 0;
              for (i = k; i < m; i++) {
                s += qr.get(i, k) * qr.get(i, j);
              }
              s = -s / qr.get(k, k);
              for (i = k; i < m; i++) {
                qr.set(i, j, qr.get(i, j) + s * qr.get(i, k));
              }
            }
          }
          rdiag[k] = -nrm;
        }

        this.QR = qr;
        this.Rdiag = rdiag;
      }

      /**
       * Solve a problem of least square (Ax=b) by using the QR decomposition. Useful when A is rectangular, but not working when A is singular.
       * Example : We search to approximate x, with A matrix shape m*n, x vector size n, b vector size m (m > n). We will use :
       * var qr = QrDecomposition(A);
       * var x = qr.solve(b);
       * @param {Matrix} value - Matrix 1D which is the vector b (in the equation Ax = b)
       * @return {Matrix} - The vector x
       */
      solve(value) {
        value = Matrix.checkMatrix(value);

        var qr = this.QR;
        var m = qr.rows;

        if (value.rows !== m) {
          throw new Error('Matrix row dimensions must agree');
        }
        if (!this.isFullRank()) {
          throw new Error('Matrix is rank deficient');
        }

        var count = value.columns;
        var X = value.clone();
        var n = qr.columns;
        var i, j, k, s;

        for (k = 0; k < n; k++) {
          for (j = 0; j < count; j++) {
            s = 0;
            for (i = k; i < m; i++) {
              s += qr[i][k] * X[i][j];
            }
            s = -s / qr[k][k];
            for (i = k; i < m; i++) {
              X[i][j] += s * qr[i][k];
            }
          }
        }
        for (k = n - 1; k >= 0; k--) {
          for (j = 0; j < count; j++) {
            X[k][j] /= this.Rdiag[k];
          }
          for (i = 0; i < k; i++) {
            for (j = 0; j < count; j++) {
              X[i][j] -= X[k][j] * qr[i][k];
            }
          }
        }

        return X.subMatrix(0, n - 1, 0, count - 1);
      }

      /**
       *
       * @return {boolean}
       */
      isFullRank() {
        var columns = this.QR.columns;
        for (var i = 0; i < columns; i++) {
          if (this.Rdiag[i] === 0) {
            return false;
          }
        }
        return true;
      }

      /**
       *
       * @return {Matrix}
       */
      get upperTriangularMatrix() {
        var qr = this.QR;
        var n = qr.columns;
        var X = new Matrix(n, n);
        var i, j;
        for (i = 0; i < n; i++) {
          for (j = 0; j < n; j++) {
            if (i < j) {
              X[i][j] = qr[i][j];
            } else if (i === j) {
              X[i][j] = this.Rdiag[i];
            } else {
              X[i][j] = 0;
            }
          }
        }
        return X;
      }

      /**
       *
       * @return {Matrix}
       */
      get orthogonalMatrix() {
        var qr = this.QR;
        var rows = qr.rows;
        var columns = qr.columns;
        var X = new Matrix(rows, columns);
        var i, j, k, s;

        for (k = columns - 1; k >= 0; k--) {
          for (i = 0; i < rows; i++) {
            X[i][k] = 0;
          }
          X[k][k] = 1;
          for (j = k; j < columns; j++) {
            if (qr[k][k] !== 0) {
              s = 0;
              for (i = k; i < rows; i++) {
                s += qr[i][k] * X[i][j];
              }

              s = -s / qr[k][k];

              for (i = k; i < rows; i++) {
                X[i][j] += s * qr[i][k];
              }
            }
          }
        }
        return X;
      }
    }

    /**
     * Computes the inverse of a Matrix
     * @param {Matrix} matrix
     * @param {boolean} [useSVD=false]
     * @return {Matrix}
     */
    function inverse(matrix, useSVD = false) {
      matrix = WrapperMatrix2D.checkMatrix(matrix);
      if (useSVD) {
        return new SingularValueDecomposition(matrix).inverse();
      } else {
        return solve(matrix, Matrix.eye(matrix.rows));
      }
    }

    /**
     *
     * @param {Matrix} leftHandSide
     * @param {Matrix} rightHandSide
     * @param {boolean} [useSVD = false]
     * @return {Matrix}
     */
    function solve(leftHandSide, rightHandSide, useSVD = false) {
      leftHandSide = WrapperMatrix2D.checkMatrix(leftHandSide);
      rightHandSide = WrapperMatrix2D.checkMatrix(rightHandSide);
      if (useSVD) {
        return new SingularValueDecomposition(leftHandSide).solve(rightHandSide);
      } else {
        return leftHandSide.isSquare()
          ? new LuDecomposition(leftHandSide).solve(rightHandSide)
          : new QrDecomposition(leftHandSide).solve(rightHandSide);
      }
    }

    /**
     * @class EigenvalueDecomposition
     * @link https://github.com/lutzroeder/Mapack/blob/master/Source/EigenvalueDecomposition.cs
     * @param {Matrix} matrix
     * @param {object} [options]
     * @param {boolean} [options.assumeSymmetric=false]
     */
    class EigenvalueDecomposition {
      constructor(matrix, options = {}) {
        const { assumeSymmetric = false } = options;

        matrix = WrapperMatrix2D.checkMatrix(matrix);
        if (!matrix.isSquare()) {
          throw new Error('Matrix is not a square matrix');
        }

        var n = matrix.columns;
        var V = getFilled2DArray(n, n, 0);
        var d = new Array(n);
        var e = new Array(n);
        var value = matrix;
        var i, j;

        var isSymmetric = false;
        if (assumeSymmetric) {
          isSymmetric = true;
        } else {
          isSymmetric = matrix.isSymmetric();
        }

        if (isSymmetric) {
          for (i = 0; i < n; i++) {
            for (j = 0; j < n; j++) {
              V[i][j] = value.get(i, j);
            }
          }
          tred2(n, e, d, V);
          tql2(n, e, d, V);
        } else {
          var H = getFilled2DArray(n, n, 0);
          var ort = new Array(n);
          for (j = 0; j < n; j++) {
            for (i = 0; i < n; i++) {
              H[i][j] = value.get(i, j);
            }
          }
          orthes(n, H, ort, V);
          hqr2(n, e, d, V, H);
        }

        this.n = n;
        this.e = e;
        this.d = d;
        this.V = V;
      }

      /**
       *
       * @return {Array<number>}
       */
      get realEigenvalues() {
        return this.d;
      }

      /**
       *
       * @return {Array<number>}
       */
      get imaginaryEigenvalues() {
        return this.e;
      }

      /**
       *
       * @return {Matrix}
       */
      get eigenvectorMatrix() {
        if (!Matrix.isMatrix(this.V)) {
          this.V = new Matrix(this.V);
        }
        return this.V;
      }

      /**
       *
       * @return {Matrix}
       */
      get diagonalMatrix() {
        var n = this.n;
        var e = this.e;
        var d = this.d;
        var X = new Matrix(n, n);
        var i, j;
        for (i = 0; i < n; i++) {
          for (j = 0; j < n; j++) {
            X[i][j] = 0;
          }
          X[i][i] = d[i];
          if (e[i] > 0) {
            X[i][i + 1] = e[i];
          } else if (e[i] < 0) {
            X[i][i - 1] = e[i];
          }
        }
        return X;
      }
    }

    function tred2(n, e, d, V) {
      var f, g, h, i, j, k, hh, scale;

      for (j = 0; j < n; j++) {
        d[j] = V[n - 1][j];
      }

      for (i = n - 1; i > 0; i--) {
        scale = 0;
        h = 0;
        for (k = 0; k < i; k++) {
          scale = scale + Math.abs(d[k]);
        }

        if (scale === 0) {
          e[i] = d[i - 1];
          for (j = 0; j < i; j++) {
            d[j] = V[i - 1][j];
            V[i][j] = 0;
            V[j][i] = 0;
          }
        } else {
          for (k = 0; k < i; k++) {
            d[k] /= scale;
            h += d[k] * d[k];
          }

          f = d[i - 1];
          g = Math.sqrt(h);
          if (f > 0) {
            g = -g;
          }

          e[i] = scale * g;
          h = h - f * g;
          d[i - 1] = f - g;
          for (j = 0; j < i; j++) {
            e[j] = 0;
          }

          for (j = 0; j < i; j++) {
            f = d[j];
            V[j][i] = f;
            g = e[j] + V[j][j] * f;
            for (k = j + 1; k <= i - 1; k++) {
              g += V[k][j] * d[k];
              e[k] += V[k][j] * f;
            }
            e[j] = g;
          }

          f = 0;
          for (j = 0; j < i; j++) {
            e[j] /= h;
            f += e[j] * d[j];
          }

          hh = f / (h + h);
          for (j = 0; j < i; j++) {
            e[j] -= hh * d[j];
          }

          for (j = 0; j < i; j++) {
            f = d[j];
            g = e[j];
            for (k = j; k <= i - 1; k++) {
              V[k][j] -= f * e[k] + g * d[k];
            }
            d[j] = V[i - 1][j];
            V[i][j] = 0;
          }
        }
        d[i] = h;
      }

      for (i = 0; i < n - 1; i++) {
        V[n - 1][i] = V[i][i];
        V[i][i] = 1;
        h = d[i + 1];
        if (h !== 0) {
          for (k = 0; k <= i; k++) {
            d[k] = V[k][i + 1] / h;
          }

          for (j = 0; j <= i; j++) {
            g = 0;
            for (k = 0; k <= i; k++) {
              g += V[k][i + 1] * V[k][j];
            }
            for (k = 0; k <= i; k++) {
              V[k][j] -= g * d[k];
            }
          }
        }

        for (k = 0; k <= i; k++) {
          V[k][i + 1] = 0;
        }
      }

      for (j = 0; j < n; j++) {
        d[j] = V[n - 1][j];
        V[n - 1][j] = 0;
      }

      V[n - 1][n - 1] = 1;
      e[0] = 0;
    }

    function tql2(n, e, d, V) {
      var g, h, i, j, k, l, m, p, r, dl1, c, c2, c3, el1, s, s2;

      for (i = 1; i < n; i++) {
        e[i - 1] = e[i];
      }

      e[n - 1] = 0;

      var f = 0;
      var tst1 = 0;
      var eps = Number.EPSILON;

      for (l = 0; l < n; l++) {
        tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
        m = l;
        while (m < n) {
          if (Math.abs(e[m]) <= eps * tst1) {
            break;
          }
          m++;
        }

        if (m > l) {
          do {

            g = d[l];
            p = (d[l + 1] - g) / (2 * e[l]);
            r = hypotenuse(p, 1);
            if (p < 0) {
              r = -r;
            }

            d[l] = e[l] / (p + r);
            d[l + 1] = e[l] * (p + r);
            dl1 = d[l + 1];
            h = g - d[l];
            for (i = l + 2; i < n; i++) {
              d[i] -= h;
            }

            f = f + h;

            p = d[m];
            c = 1;
            c2 = c;
            c3 = c;
            el1 = e[l + 1];
            s = 0;
            s2 = 0;
            for (i = m - 1; i >= l; i--) {
              c3 = c2;
              c2 = c;
              s2 = s;
              g = c * e[i];
              h = c * p;
              r = hypotenuse(p, e[i]);
              e[i + 1] = s * r;
              s = e[i] / r;
              c = p / r;
              p = c * d[i] - s * g;
              d[i + 1] = h + s * (c * g + s * d[i]);

              for (k = 0; k < n; k++) {
                h = V[k][i + 1];
                V[k][i + 1] = s * V[k][i] + c * h;
                V[k][i] = c * V[k][i] - s * h;
              }
            }

            p = -s * s2 * c3 * el1 * e[l] / dl1;
            e[l] = s * p;
            d[l] = c * p;
          } while (Math.abs(e[l]) > eps * tst1);
        }
        d[l] = d[l] + f;
        e[l] = 0;
      }

      for (i = 0; i < n - 1; i++) {
        k = i;
        p = d[i];
        for (j = i + 1; j < n; j++) {
          if (d[j] < p) {
            k = j;
            p = d[j];
          }
        }

        if (k !== i) {
          d[k] = d[i];
          d[i] = p;
          for (j = 0; j < n; j++) {
            p = V[j][i];
            V[j][i] = V[j][k];
            V[j][k] = p;
          }
        }
      }
    }

    function orthes(n, H, ort, V) {
      var low = 0;
      var high = n - 1;
      var f, g, h, i, j, m;
      var scale;

      for (m = low + 1; m <= high - 1; m++) {
        scale = 0;
        for (i = m; i <= high; i++) {
          scale = scale + Math.abs(H[i][m - 1]);
        }

        if (scale !== 0) {
          h = 0;
          for (i = high; i >= m; i--) {
            ort[i] = H[i][m - 1] / scale;
            h += ort[i] * ort[i];
          }

          g = Math.sqrt(h);
          if (ort[m] > 0) {
            g = -g;
          }

          h = h - ort[m] * g;
          ort[m] = ort[m] - g;

          for (j = m; j < n; j++) {
            f = 0;
            for (i = high; i >= m; i--) {
              f += ort[i] * H[i][j];
            }

            f = f / h;
            for (i = m; i <= high; i++) {
              H[i][j] -= f * ort[i];
            }
          }

          for (i = 0; i <= high; i++) {
            f = 0;
            for (j = high; j >= m; j--) {
              f += ort[j] * H[i][j];
            }

            f = f / h;
            for (j = m; j <= high; j++) {
              H[i][j] -= f * ort[j];
            }
          }

          ort[m] = scale * ort[m];
          H[m][m - 1] = scale * g;
        }
      }

      for (i = 0; i < n; i++) {
        for (j = 0; j < n; j++) {
          V[i][j] = i === j ? 1 : 0;
        }
      }

      for (m = high - 1; m >= low + 1; m--) {
        if (H[m][m - 1] !== 0) {
          for (i = m + 1; i <= high; i++) {
            ort[i] = H[i][m - 1];
          }

          for (j = m; j <= high; j++) {
            g = 0;
            for (i = m; i <= high; i++) {
              g += ort[i] * V[i][j];
            }

            g = g / ort[m] / H[m][m - 1];
            for (i = m; i <= high; i++) {
              V[i][j] += g * ort[i];
            }
          }
        }
      }
    }

    function hqr2(nn, e, d, V, H) {
      var n = nn - 1;
      var low = 0;
      var high = nn - 1;
      var eps = Number.EPSILON;
      var exshift = 0;
      var norm = 0;
      var p = 0;
      var q = 0;
      var r = 0;
      var s = 0;
      var z = 0;
      var iter = 0;
      var i, j, k, l, m, t, w, x, y;
      var ra, sa, vr, vi;
      var notlast, cdivres;

      for (i = 0; i < nn; i++) {
        if (i < low || i > high) {
          d[i] = H[i][i];
          e[i] = 0;
        }

        for (j = Math.max(i - 1, 0); j < nn; j++) {
          norm = norm + Math.abs(H[i][j]);
        }
      }

      while (n >= low) {
        l = n;
        while (l > low) {
          s = Math.abs(H[l - 1][l - 1]) + Math.abs(H[l][l]);
          if (s === 0) {
            s = norm;
          }
          if (Math.abs(H[l][l - 1]) < eps * s) {
            break;
          }
          l--;
        }

        if (l === n) {
          H[n][n] = H[n][n] + exshift;
          d[n] = H[n][n];
          e[n] = 0;
          n--;
          iter = 0;
        } else if (l === n - 1) {
          w = H[n][n - 1] * H[n - 1][n];
          p = (H[n - 1][n - 1] - H[n][n]) / 2;
          q = p * p + w;
          z = Math.sqrt(Math.abs(q));
          H[n][n] = H[n][n] + exshift;
          H[n - 1][n - 1] = H[n - 1][n - 1] + exshift;
          x = H[n][n];

          if (q >= 0) {
            z = p >= 0 ? p + z : p - z;
            d[n - 1] = x + z;
            d[n] = d[n - 1];
            if (z !== 0) {
              d[n] = x - w / z;
            }
            e[n - 1] = 0;
            e[n] = 0;
            x = H[n][n - 1];
            s = Math.abs(x) + Math.abs(z);
            p = x / s;
            q = z / s;
            r = Math.sqrt(p * p + q * q);
            p = p / r;
            q = q / r;

            for (j = n - 1; j < nn; j++) {
              z = H[n - 1][j];
              H[n - 1][j] = q * z + p * H[n][j];
              H[n][j] = q * H[n][j] - p * z;
            }

            for (i = 0; i <= n; i++) {
              z = H[i][n - 1];
              H[i][n - 1] = q * z + p * H[i][n];
              H[i][n] = q * H[i][n] - p * z;
            }

            for (i = low; i <= high; i++) {
              z = V[i][n - 1];
              V[i][n - 1] = q * z + p * V[i][n];
              V[i][n] = q * V[i][n] - p * z;
            }
          } else {
            d[n - 1] = x + p;
            d[n] = x + p;
            e[n - 1] = z;
            e[n] = -z;
          }

          n = n - 2;
          iter = 0;
        } else {
          x = H[n][n];
          y = 0;
          w = 0;
          if (l < n) {
            y = H[n - 1][n - 1];
            w = H[n][n - 1] * H[n - 1][n];
          }

          if (iter === 10) {
            exshift += x;
            for (i = low; i <= n; i++) {
              H[i][i] -= x;
            }
            s = Math.abs(H[n][n - 1]) + Math.abs(H[n - 1][n - 2]);
            x = y = 0.75 * s;
            w = -0.4375 * s * s;
          }

          if (iter === 30) {
            s = (y - x) / 2;
            s = s * s + w;
            if (s > 0) {
              s = Math.sqrt(s);
              if (y < x) {
                s = -s;
              }
              s = x - w / ((y - x) / 2 + s);
              for (i = low; i <= n; i++) {
                H[i][i] -= s;
              }
              exshift += s;
              x = y = w = 0.964;
            }
          }

          iter = iter + 1;

          m = n - 2;
          while (m >= l) {
            z = H[m][m];
            r = x - z;
            s = y - z;
            p = (r * s - w) / H[m + 1][m] + H[m][m + 1];
            q = H[m + 1][m + 1] - z - r - s;
            r = H[m + 2][m + 1];
            s = Math.abs(p) + Math.abs(q) + Math.abs(r);
            p = p / s;
            q = q / s;
            r = r / s;
            if (m === l) {
              break;
            }
            if (
              Math.abs(H[m][m - 1]) * (Math.abs(q) + Math.abs(r)) <
              eps *
                (Math.abs(p) *
                  (Math.abs(H[m - 1][m - 1]) +
                    Math.abs(z) +
                    Math.abs(H[m + 1][m + 1])))
            ) {
              break;
            }
            m--;
          }

          for (i = m + 2; i <= n; i++) {
            H[i][i - 2] = 0;
            if (i > m + 2) {
              H[i][i - 3] = 0;
            }
          }

          for (k = m; k <= n - 1; k++) {
            notlast = k !== n - 1;
            if (k !== m) {
              p = H[k][k - 1];
              q = H[k + 1][k - 1];
              r = notlast ? H[k + 2][k - 1] : 0;
              x = Math.abs(p) + Math.abs(q) + Math.abs(r);
              if (x !== 0) {
                p = p / x;
                q = q / x;
                r = r / x;
              }
            }

            if (x === 0) {
              break;
            }

            s = Math.sqrt(p * p + q * q + r * r);
            if (p < 0) {
              s = -s;
            }

            if (s !== 0) {
              if (k !== m) {
                H[k][k - 1] = -s * x;
              } else if (l !== m) {
                H[k][k - 1] = -H[k][k - 1];
              }

              p = p + s;
              x = p / s;
              y = q / s;
              z = r / s;
              q = q / p;
              r = r / p;

              for (j = k; j < nn; j++) {
                p = H[k][j] + q * H[k + 1][j];
                if (notlast) {
                  p = p + r * H[k + 2][j];
                  H[k + 2][j] = H[k + 2][j] - p * z;
                }

                H[k][j] = H[k][j] - p * x;
                H[k + 1][j] = H[k + 1][j] - p * y;
              }

              for (i = 0; i <= Math.min(n, k + 3); i++) {
                p = x * H[i][k] + y * H[i][k + 1];
                if (notlast) {
                  p = p + z * H[i][k + 2];
                  H[i][k + 2] = H[i][k + 2] - p * r;
                }

                H[i][k] = H[i][k] - p;
                H[i][k + 1] = H[i][k + 1] - p * q;
              }

              for (i = low; i <= high; i++) {
                p = x * V[i][k] + y * V[i][k + 1];
                if (notlast) {
                  p = p + z * V[i][k + 2];
                  V[i][k + 2] = V[i][k + 2] - p * r;
                }

                V[i][k] = V[i][k] - p;
                V[i][k + 1] = V[i][k + 1] - p * q;
              }
            }
          }
        }
      }

      if (norm === 0) {
        return;
      }

      for (n = nn - 1; n >= 0; n--) {
        p = d[n];
        q = e[n];

        if (q === 0) {
          l = n;
          H[n][n] = 1;
          for (i = n - 1; i >= 0; i--) {
            w = H[i][i] - p;
            r = 0;
            for (j = l; j <= n; j++) {
              r = r + H[i][j] * H[j][n];
            }

            if (e[i] < 0) {
              z = w;
              s = r;
            } else {
              l = i;
              if (e[i] === 0) {
                H[i][n] = w !== 0 ? -r / w : -r / (eps * norm);
              } else {
                x = H[i][i + 1];
                y = H[i + 1][i];
                q = (d[i] - p) * (d[i] - p) + e[i] * e[i];
                t = (x * s - z * r) / q;
                H[i][n] = t;
                H[i + 1][n] =
                  Math.abs(x) > Math.abs(z) ? (-r - w * t) / x : (-s - y * t) / z;
              }

              t = Math.abs(H[i][n]);
              if (eps * t * t > 1) {
                for (j = i; j <= n; j++) {
                  H[j][n] = H[j][n] / t;
                }
              }
            }
          }
        } else if (q < 0) {
          l = n - 1;

          if (Math.abs(H[n][n - 1]) > Math.abs(H[n - 1][n])) {
            H[n - 1][n - 1] = q / H[n][n - 1];
            H[n - 1][n] = -(H[n][n] - p) / H[n][n - 1];
          } else {
            cdivres = cdiv(0, -H[n - 1][n], H[n - 1][n - 1] - p, q);
            H[n - 1][n - 1] = cdivres[0];
            H[n - 1][n] = cdivres[1];
          }

          H[n][n - 1] = 0;
          H[n][n] = 1;
          for (i = n - 2; i >= 0; i--) {
            ra = 0;
            sa = 0;
            for (j = l; j <= n; j++) {
              ra = ra + H[i][j] * H[j][n - 1];
              sa = sa + H[i][j] * H[j][n];
            }

            w = H[i][i] - p;

            if (e[i] < 0) {
              z = w;
              r = ra;
              s = sa;
            } else {
              l = i;
              if (e[i] === 0) {
                cdivres = cdiv(-ra, -sa, w, q);
                H[i][n - 1] = cdivres[0];
                H[i][n] = cdivres[1];
              } else {
                x = H[i][i + 1];
                y = H[i + 1][i];
                vr = (d[i] - p) * (d[i] - p) + e[i] * e[i] - q * q;
                vi = (d[i] - p) * 2 * q;
                if (vr === 0 && vi === 0) {
                  vr =
                    eps *
                    norm *
                    (Math.abs(w) +
                      Math.abs(q) +
                      Math.abs(x) +
                      Math.abs(y) +
                      Math.abs(z));
                }
                cdivres = cdiv(
                  x * r - z * ra + q * sa,
                  x * s - z * sa - q * ra,
                  vr,
                  vi
                );
                H[i][n - 1] = cdivres[0];
                H[i][n] = cdivres[1];
                if (Math.abs(x) > Math.abs(z) + Math.abs(q)) {
                  H[i + 1][n - 1] = (-ra - w * H[i][n - 1] + q * H[i][n]) / x;
                  H[i + 1][n] = (-sa - w * H[i][n] - q * H[i][n - 1]) / x;
                } else {
                  cdivres = cdiv(-r - y * H[i][n - 1], -s - y * H[i][n], z, q);
                  H[i + 1][n - 1] = cdivres[0];
                  H[i + 1][n] = cdivres[1];
                }
              }

              t = Math.max(Math.abs(H[i][n - 1]), Math.abs(H[i][n]));
              if (eps * t * t > 1) {
                for (j = i; j <= n; j++) {
                  H[j][n - 1] = H[j][n - 1] / t;
                  H[j][n] = H[j][n] / t;
                }
              }
            }
          }
        }
      }

      for (i = 0; i < nn; i++) {
        if (i < low || i > high) {
          for (j = i; j < nn; j++) {
            V[i][j] = H[i][j];
          }
        }
      }

      for (j = nn - 1; j >= low; j--) {
        for (i = low; i <= high; i++) {
          z = 0;
          for (k = low; k <= Math.min(j, high); k++) {
            z = z + V[i][k] * H[k][j];
          }
          V[i][j] = z;
        }
      }
    }

    function cdiv(xr, xi, yr, yi) {
      var r, d;
      if (Math.abs(yr) > Math.abs(yi)) {
        r = yi / yr;
        d = yr + r * yi;
        return [(xr + r * xi) / d, (xi - r * xr) / d];
      } else {
        r = yr / yi;
        d = yi + r * yr;
        return [(r * xr + xi) / d, (r * xi - xr) / d];
      }
    }

    /**
     * @class CholeskyDecomposition
     * @link https://github.com/lutzroeder/Mapack/blob/master/Source/CholeskyDecomposition.cs
     * @param {Matrix} value
     */
    class CholeskyDecomposition {
      constructor(value) {
        value = WrapperMatrix2D.checkMatrix(value);
        if (!value.isSymmetric()) {
          throw new Error('Matrix is not symmetric');
        }

        var a = value;
        var dimension = a.rows;
        var l = new Matrix(dimension, dimension);
        var positiveDefinite = true;
        var i, j, k;

        for (j = 0; j < dimension; j++) {
          var Lrowj = l[j];
          var d = 0;
          for (k = 0; k < j; k++) {
            var Lrowk = l[k];
            var s = 0;
            for (i = 0; i < k; i++) {
              s += Lrowk[i] * Lrowj[i];
            }
            Lrowj[k] = s = (a.get(j, k) - s) / l[k][k];
            d = d + s * s;
          }

          d = a.get(j, j) - d;

          positiveDefinite &= d > 0;
          l[j][j] = Math.sqrt(Math.max(d, 0));
          for (k = j + 1; k < dimension; k++) {
            l[j][k] = 0;
          }
        }

        if (!positiveDefinite) {
          throw new Error('Matrix is not positive definite');
        }

        this.L = l;
      }

      /**
       *
       * @param {Matrix} value
       * @return {Matrix}
       */
      solve(value) {
        value = WrapperMatrix2D.checkMatrix(value);

        var l = this.L;
        var dimension = l.rows;

        if (value.rows !== dimension) {
          throw new Error('Matrix dimensions do not match');
        }

        var count = value.columns;
        var B = value.clone();
        var i, j, k;

        for (k = 0; k < dimension; k++) {
          for (j = 0; j < count; j++) {
            for (i = 0; i < k; i++) {
              B[k][j] -= B[i][j] * l[k][i];
            }
            B[k][j] /= l[k][k];
          }
        }

        for (k = dimension - 1; k >= 0; k--) {
          for (j = 0; j < count; j++) {
            for (i = k + 1; i < dimension; i++) {
              B[k][j] -= B[i][j] * l[i][k];
            }
            B[k][j] /= l[k][k];
          }
        }

        return B;
      }

      /**
       *
       * @return {Matrix}
       */
      get lowerTriangularMatrix() {
        return this.L;
      }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getAugmentedNamespace(n) {
    	if (n.__esModule) return n;
    	var a = Object.defineProperty({}, '__esModule', {value: true});
    	Object.keys(n).forEach(function (k) {
    		var d = Object.getOwnPropertyDescriptor(n, k);
    		Object.defineProperty(a, k, d.get ? d : {
    			enumerable: true,
    			get: function () {
    				return n[k];
    			}
    		});
    	});
    	return a;
    }

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var func$3 = Symbol('func');
    var validate = Symbol('validate');

    var symbols = {
    	func: func$3,
    	validate: validate
    };

    const { func: func$2 } = symbols;

    const numberPredicates = {
      positive: (value) => (value > 0),
      negative: (value) => (value < 0),
      nonNegative: (value) => (value >= 0),
      integer: (value) => (value === (value | 0)),

      [func$2]: {
        is: (fn) => fn,
        eq: (v) => (value) => (value === v),
        gt: (v) => (value) => (value > v),
        gte: (v) => (value) => (value >= v),
        lt: (v) => (value) => (value < v),
        lte: (v) => (value) => (value <= v)
      }
    };

    var number$2 = {
      predicates: numberPredicates,
      validator: (value) => {
        return typeof value === 'number'
      }
    };

    const { func: func$1 } = symbols;

    const stringPredicates = {
      empty: (value) => (value === ''),
      nonEmpty: (value) => (value !== ''),

      [func$1]: {
        is: (fn) => fn,
        eq: (v) => (value) => (value === v),
        length: (v) => (value) => (value.length === v),
        minLength: (v) => (value) => (value.length >= v),
        maxLength: (v) => (value) => (value.length <= v),
        matches: (v) => (value) => v.test(value),
        startsWith: (v) => (value) => value.startsWith(v),
        endsWith: (v) => (value) => value.endsWith(v)
      }
    };

    var string = {
      predicates: stringPredicates,
      validator: (value) => {
        return typeof value === 'string'
      }
    };

    const { func } = symbols;

    const objectPredicates = {
      plain: (value) => {
        if (typeof value !== 'object') return false

        const proto = Object.getPrototypeOf(value);
        return proto === null || proto === Object.getPrototypeOf({})
      },
      empty: (value) => Object.keys(value).length === 0,
      nonEmpty: (value) => Object.keys(value).length > 0,

      [func]: {
        is: (fn) => fn,
        instanceOf: (v) => (value) => (value instanceof v)
      }
    };

    var object$1 = {
      predicates: objectPredicates,
      validator: (value) => {
        return typeof value === 'object'
      }
    };

    const typePredicates = {
      number: number$2,
      string,
      object: object$1
    };

    const createOw = ({
      validators = [],
      predicates = typePredicates,
      type = null
    } = { }) => {
      const ow = new Proxy(function () { }, {
        get: (obj, key) => {
          if (key === symbols.validate) {
            return (value, label = 'argument') => {
              if (!type) {
                return new Error('missing required type specifier')
              }

              for (let i = 0; i < validators.length; ++i) {
                const validator = validators[i];
                const result = validator.fn(value);

                if (!result) {
                  if (i === 0) {
                    throw new Error(`Expected ${label} \`${value}\` to be of type \`${type}\`, but received type \`${typeof value}\``)
                  } else {
                    throw new Error(`Expected ${type} \`${label}\` \`${value}\` failed predicate \`${validator.key}\``)
                  }
                }
              }
            }
          }

          const predicate = predicates[key];

          if (predicate) {
            if (typeof predicate === 'function') {
              validators.push({
                key,
                fn: predicate
              });

              return ow
            } else {
              return createOw({
                type: key,
                validators: [
                  {
                    key,
                    fn: predicate.validator
                  }
                ],
                predicates: predicate.predicates
              })
            }
          } else {
            const fn = predicates[symbols.func] && predicates[symbols.func][key];

            if (fn) {
              return new Proxy(function () { }, {
                get: () => {
                  throw new Error(`invalid use of functional predicate "${key}"`)
                },

                apply: (obj, thisArg, args) => {
                  validators.push({
                    key,
                    fn: fn(...args)
                  });

                  return ow
                }
              })
            } else {
              if (key === 'default' || key === '__esModule') {
                return ow
              }

              return ow
              // throw new Error(`unrecognized predicate "${key}"`)
            }
          }
        },

        apply: (obj, thisArg, args) => {
          if (args.length !== 2 && args.length !== 3) {
            throw new Error('invalid number of arguments to "ow"')
          } else {
            args[1][symbols.validate](args[0], args[2]);
          }
        }
      });

      return ow
    };

    var owLite = createOw();

    var _createClass$1 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var RNG = function () {
      function RNG() {
        _classCallCheck$1(this, RNG);
      }

      _createClass$1(RNG, [{
        key: 'next',
        value: function next() {
          throw new Error('RNG.next must be overridden');
        }
      }, {
        key: 'seed',
        value: function seed(_seed, opts) {
          throw new Error('RNG.seed must be overridden');
        }
      }, {
        key: 'clone',
        value: function clone(seed, opts) {
          throw new Error('RNG.clone must be overridden');
        }
      }, {
        key: '_seed',
        value: function _seed(seed, opts) {
          // TODO: add entropy and stuff

          if (seed === (seed | 0)) {
            return seed;
          } else {
            var strSeed = '' + seed;
            var s = 0;

            for (var k = 0; k < strSeed.length; ++k) {
              s ^= strSeed.charCodeAt(k) | 0;
            }

            return s;
          }
        }
      }, {
        key: 'name',
        get: function get() {
          throw new Error('RNG.name must be overridden');
        }
      }]);

      return RNG;
    }();

    var _default$f = RNG;


    var rng = /*#__PURE__*/Object.defineProperty({
    	default: _default$f
    }, '__esModule', {value: true});

    var alea = createCommonjsModule(function (module) {
    // A port of an algorithm by Johannes Baagøe <baagoe@baagoe.com>, 2010
    // http://baagoe.com/en/RandomMusings/javascript/
    // https://github.com/nquinlan/better-random-numbers-for-javascript-mirror
    // Original work is under MIT license -

    // Copyright (C) 2010 by Johannes Baagøe <baagoe@baagoe.org>
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.



    (function(global, module, define) {

    function Alea(seed) {
      var me = this, mash = Mash();

      me.next = function() {
        var t = 2091639 * me.s0 + me.c * 2.3283064365386963e-10; // 2^-32
        me.s0 = me.s1;
        me.s1 = me.s2;
        return me.s2 = t - (me.c = t | 0);
      };

      // Apply the seeding algorithm from Baagoe.
      me.c = 1;
      me.s0 = mash(' ');
      me.s1 = mash(' ');
      me.s2 = mash(' ');
      me.s0 -= mash(seed);
      if (me.s0 < 0) { me.s0 += 1; }
      me.s1 -= mash(seed);
      if (me.s1 < 0) { me.s1 += 1; }
      me.s2 -= mash(seed);
      if (me.s2 < 0) { me.s2 += 1; }
      mash = null;
    }

    function copy(f, t) {
      t.c = f.c;
      t.s0 = f.s0;
      t.s1 = f.s1;
      t.s2 = f.s2;
      return t;
    }

    function impl(seed, opts) {
      var xg = new Alea(seed),
          state = opts && opts.state,
          prng = xg.next;
      prng.int32 = function() { return (xg.next() * 0x100000000) | 0; };
      prng.double = function() {
        return prng() + (prng() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
      };
      prng.quick = prng;
      if (state) {
        if (typeof(state) == 'object') copy(state, xg);
        prng.state = function() { return copy(xg, {}); };
      }
      return prng;
    }

    function Mash() {
      var n = 0xefc8249d;

      var mash = function(data) {
        data = String(data);
        for (var i = 0; i < data.length; i++) {
          n += data.charCodeAt(i);
          var h = 0.02519603282416938 * n;
          n = h >>> 0;
          h -= n;
          h *= n;
          n = h >>> 0;
          h -= n;
          n += h * 0x100000000; // 2^32
        }
        return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
      };

      return mash;
    }


    if (module && module.exports) {
      module.exports = impl;
    } else if (define && define.amd) {
      define(function() { return impl; });
    } else {
      this.alea = impl;
    }

    })(
      commonjsGlobal,
      module,    // present in node.js
      (typeof undefined) == 'function'    // present with an AMD loader
    );
    });

    var xor128 = createCommonjsModule(function (module) {
    // A Javascript implementaion of the "xor128" prng algorithm by
    // George Marsaglia.  See http://www.jstatsoft.org/v08/i14/paper

    (function(global, module, define) {

    function XorGen(seed) {
      var me = this, strseed = '';

      me.x = 0;
      me.y = 0;
      me.z = 0;
      me.w = 0;

      // Set up generator function.
      me.next = function() {
        var t = me.x ^ (me.x << 11);
        me.x = me.y;
        me.y = me.z;
        me.z = me.w;
        return me.w ^= (me.w >>> 19) ^ t ^ (t >>> 8);
      };

      if (seed === (seed | 0)) {
        // Integer seed.
        me.x = seed;
      } else {
        // String seed.
        strseed += seed;
      }

      // Mix in string seed, then discard an initial batch of 64 values.
      for (var k = 0; k < strseed.length + 64; k++) {
        me.x ^= strseed.charCodeAt(k) | 0;
        me.next();
      }
    }

    function copy(f, t) {
      t.x = f.x;
      t.y = f.y;
      t.z = f.z;
      t.w = f.w;
      return t;
    }

    function impl(seed, opts) {
      var xg = new XorGen(seed),
          state = opts && opts.state,
          prng = function() { return (xg.next() >>> 0) / 0x100000000; };
      prng.double = function() {
        do {
          var top = xg.next() >>> 11,
              bot = (xg.next() >>> 0) / 0x100000000,
              result = (top + bot) / (1 << 21);
        } while (result === 0);
        return result;
      };
      prng.int32 = xg.next;
      prng.quick = prng;
      if (state) {
        if (typeof(state) == 'object') copy(state, xg);
        prng.state = function() { return copy(xg, {}); };
      }
      return prng;
    }

    if (module && module.exports) {
      module.exports = impl;
    } else if (define && define.amd) {
      define(function() { return impl; });
    } else {
      this.xor128 = impl;
    }

    })(
      commonjsGlobal,
      module,    // present in node.js
      (typeof undefined) == 'function'    // present with an AMD loader
    );
    });

    var xorwow = createCommonjsModule(function (module) {
    // A Javascript implementaion of the "xorwow" prng algorithm by
    // George Marsaglia.  See http://www.jstatsoft.org/v08/i14/paper

    (function(global, module, define) {

    function XorGen(seed) {
      var me = this, strseed = '';

      // Set up generator function.
      me.next = function() {
        var t = (me.x ^ (me.x >>> 2));
        me.x = me.y; me.y = me.z; me.z = me.w; me.w = me.v;
        return (me.d = (me.d + 362437 | 0)) +
           (me.v = (me.v ^ (me.v << 4)) ^ (t ^ (t << 1))) | 0;
      };

      me.x = 0;
      me.y = 0;
      me.z = 0;
      me.w = 0;
      me.v = 0;

      if (seed === (seed | 0)) {
        // Integer seed.
        me.x = seed;
      } else {
        // String seed.
        strseed += seed;
      }

      // Mix in string seed, then discard an initial batch of 64 values.
      for (var k = 0; k < strseed.length + 64; k++) {
        me.x ^= strseed.charCodeAt(k) | 0;
        if (k == strseed.length) {
          me.d = me.x << 10 ^ me.x >>> 4;
        }
        me.next();
      }
    }

    function copy(f, t) {
      t.x = f.x;
      t.y = f.y;
      t.z = f.z;
      t.w = f.w;
      t.v = f.v;
      t.d = f.d;
      return t;
    }

    function impl(seed, opts) {
      var xg = new XorGen(seed),
          state = opts && opts.state,
          prng = function() { return (xg.next() >>> 0) / 0x100000000; };
      prng.double = function() {
        do {
          var top = xg.next() >>> 11,
              bot = (xg.next() >>> 0) / 0x100000000,
              result = (top + bot) / (1 << 21);
        } while (result === 0);
        return result;
      };
      prng.int32 = xg.next;
      prng.quick = prng;
      if (state) {
        if (typeof(state) == 'object') copy(state, xg);
        prng.state = function() { return copy(xg, {}); };
      }
      return prng;
    }

    if (module && module.exports) {
      module.exports = impl;
    } else if (define && define.amd) {
      define(function() { return impl; });
    } else {
      this.xorwow = impl;
    }

    })(
      commonjsGlobal,
      module,    // present in node.js
      (typeof undefined) == 'function'    // present with an AMD loader
    );
    });

    var xorshift7 = createCommonjsModule(function (module) {
    // A Javascript implementaion of the "xorshift7" algorithm by
    // François Panneton and Pierre L'ecuyer:
    // "On the Xorgshift Random Number Generators"
    // http://saluc.engr.uconn.edu/refs/crypto/rng/panneton05onthexorshift.pdf

    (function(global, module, define) {

    function XorGen(seed) {
      var me = this;

      // Set up generator function.
      me.next = function() {
        // Update xor generator.
        var X = me.x, i = me.i, t, v;
        t = X[i]; t ^= (t >>> 7); v = t ^ (t << 24);
        t = X[(i + 1) & 7]; v ^= t ^ (t >>> 10);
        t = X[(i + 3) & 7]; v ^= t ^ (t >>> 3);
        t = X[(i + 4) & 7]; v ^= t ^ (t << 7);
        t = X[(i + 7) & 7]; t = t ^ (t << 13); v ^= t ^ (t << 9);
        X[i] = v;
        me.i = (i + 1) & 7;
        return v;
      };

      function init(me, seed) {
        var j, X = [];

        if (seed === (seed | 0)) {
          // Seed state array using a 32-bit integer.
          X[0] = seed;
        } else {
          // Seed state using a string.
          seed = '' + seed;
          for (j = 0; j < seed.length; ++j) {
            X[j & 7] = (X[j & 7] << 15) ^
                (seed.charCodeAt(j) + X[(j + 1) & 7] << 13);
          }
        }
        // Enforce an array length of 8, not all zeroes.
        while (X.length < 8) X.push(0);
        for (j = 0; j < 8 && X[j] === 0; ++j);
        if (j == 8) X[7] = -1;

        me.x = X;
        me.i = 0;

        // Discard an initial 256 values.
        for (j = 256; j > 0; --j) {
          me.next();
        }
      }

      init(me, seed);
    }

    function copy(f, t) {
      t.x = f.x.slice();
      t.i = f.i;
      return t;
    }

    function impl(seed, opts) {
      if (seed == null) seed = +(new Date);
      var xg = new XorGen(seed),
          state = opts && opts.state,
          prng = function() { return (xg.next() >>> 0) / 0x100000000; };
      prng.double = function() {
        do {
          var top = xg.next() >>> 11,
              bot = (xg.next() >>> 0) / 0x100000000,
              result = (top + bot) / (1 << 21);
        } while (result === 0);
        return result;
      };
      prng.int32 = xg.next;
      prng.quick = prng;
      if (state) {
        if (state.x) copy(state, xg);
        prng.state = function() { return copy(xg, {}); };
      }
      return prng;
    }

    if (module && module.exports) {
      module.exports = impl;
    } else if (define && define.amd) {
      define(function() { return impl; });
    } else {
      this.xorshift7 = impl;
    }

    })(
      commonjsGlobal,
      module,    // present in node.js
      (typeof undefined) == 'function'    // present with an AMD loader
    );
    });

    var xor4096 = createCommonjsModule(function (module) {
    // A Javascript implementaion of Richard Brent's Xorgens xor4096 algorithm.
    //
    // This fast non-cryptographic random number generator is designed for
    // use in Monte-Carlo algorithms. It combines a long-period xorshift
    // generator with a Weyl generator, and it passes all common batteries
    // of stasticial tests for randomness while consuming only a few nanoseconds
    // for each prng generated.  For background on the generator, see Brent's
    // paper: "Some long-period random number generators using shifts and xors."
    // http://arxiv.org/pdf/1004.3115v1.pdf
    //
    // Usage:
    //
    // var xor4096 = require('xor4096');
    // random = xor4096(1);                        // Seed with int32 or string.
    // assert.equal(random(), 0.1520436450538547); // (0, 1) range, 53 bits.
    // assert.equal(random.int32(), 1806534897);   // signed int32, 32 bits.
    //
    // For nonzero numeric keys, this impelementation provides a sequence
    // identical to that by Brent's xorgens 3 implementaion in C.  This
    // implementation also provides for initalizing the generator with
    // string seeds, or for saving and restoring the state of the generator.
    //
    // On Chrome, this prng benchmarks about 2.1 times slower than
    // Javascript's built-in Math.random().

    (function(global, module, define) {

    function XorGen(seed) {
      var me = this;

      // Set up generator function.
      me.next = function() {
        var w = me.w,
            X = me.X, i = me.i, t, v;
        // Update Weyl generator.
        me.w = w = (w + 0x61c88647) | 0;
        // Update xor generator.
        v = X[(i + 34) & 127];
        t = X[i = ((i + 1) & 127)];
        v ^= v << 13;
        t ^= t << 17;
        v ^= v >>> 15;
        t ^= t >>> 12;
        // Update Xor generator array state.
        v = X[i] = v ^ t;
        me.i = i;
        // Result is the combination.
        return (v + (w ^ (w >>> 16))) | 0;
      };

      function init(me, seed) {
        var t, v, i, j, w, X = [], limit = 128;
        if (seed === (seed | 0)) {
          // Numeric seeds initialize v, which is used to generates X.
          v = seed;
          seed = null;
        } else {
          // String seeds are mixed into v and X one character at a time.
          seed = seed + '\0';
          v = 0;
          limit = Math.max(limit, seed.length);
        }
        // Initialize circular array and weyl value.
        for (i = 0, j = -32; j < limit; ++j) {
          // Put the unicode characters into the array, and shuffle them.
          if (seed) v ^= seed.charCodeAt((j + 32) % seed.length);
          // After 32 shuffles, take v as the starting w value.
          if (j === 0) w = v;
          v ^= v << 10;
          v ^= v >>> 15;
          v ^= v << 4;
          v ^= v >>> 13;
          if (j >= 0) {
            w = (w + 0x61c88647) | 0;     // Weyl.
            t = (X[j & 127] ^= (v + w));  // Combine xor and weyl to init array.
            i = (0 == t) ? i + 1 : 0;     // Count zeroes.
          }
        }
        // We have detected all zeroes; make the key nonzero.
        if (i >= 128) {
          X[(seed && seed.length || 0) & 127] = -1;
        }
        // Run the generator 512 times to further mix the state before using it.
        // Factoring this as a function slows the main generator, so it is just
        // unrolled here.  The weyl generator is not advanced while warming up.
        i = 127;
        for (j = 4 * 128; j > 0; --j) {
          v = X[(i + 34) & 127];
          t = X[i = ((i + 1) & 127)];
          v ^= v << 13;
          t ^= t << 17;
          v ^= v >>> 15;
          t ^= t >>> 12;
          X[i] = v ^ t;
        }
        // Storing state as object members is faster than using closure variables.
        me.w = w;
        me.X = X;
        me.i = i;
      }

      init(me, seed);
    }

    function copy(f, t) {
      t.i = f.i;
      t.w = f.w;
      t.X = f.X.slice();
      return t;
    }
    function impl(seed, opts) {
      if (seed == null) seed = +(new Date);
      var xg = new XorGen(seed),
          state = opts && opts.state,
          prng = function() { return (xg.next() >>> 0) / 0x100000000; };
      prng.double = function() {
        do {
          var top = xg.next() >>> 11,
              bot = (xg.next() >>> 0) / 0x100000000,
              result = (top + bot) / (1 << 21);
        } while (result === 0);
        return result;
      };
      prng.int32 = xg.next;
      prng.quick = prng;
      if (state) {
        if (state.X) copy(state, xg);
        prng.state = function() { return copy(xg, {}); };
      }
      return prng;
    }

    if (module && module.exports) {
      module.exports = impl;
    } else if (define && define.amd) {
      define(function() { return impl; });
    } else {
      this.xor4096 = impl;
    }

    })(
      commonjsGlobal,                                     // window object or global
      module,    // present in node.js
      (typeof undefined) == 'function'    // present with an AMD loader
    );
    });

    var tychei = createCommonjsModule(function (module) {
    // A Javascript implementaion of the "Tyche-i" prng algorithm by
    // Samuel Neves and Filipe Araujo.
    // See https://eden.dei.uc.pt/~sneves/pubs/2011-snfa2.pdf

    (function(global, module, define) {

    function XorGen(seed) {
      var me = this, strseed = '';

      // Set up generator function.
      me.next = function() {
        var b = me.b, c = me.c, d = me.d, a = me.a;
        b = (b << 25) ^ (b >>> 7) ^ c;
        c = (c - d) | 0;
        d = (d << 24) ^ (d >>> 8) ^ a;
        a = (a - b) | 0;
        me.b = b = (b << 20) ^ (b >>> 12) ^ c;
        me.c = c = (c - d) | 0;
        me.d = (d << 16) ^ (c >>> 16) ^ a;
        return me.a = (a - b) | 0;
      };

      /* The following is non-inverted tyche, which has better internal
       * bit diffusion, but which is about 25% slower than tyche-i in JS.
      me.next = function() {
        var a = me.a, b = me.b, c = me.c, d = me.d;
        a = (me.a + me.b | 0) >>> 0;
        d = me.d ^ a; d = d << 16 ^ d >>> 16;
        c = me.c + d | 0;
        b = me.b ^ c; b = b << 12 ^ d >>> 20;
        me.a = a = a + b | 0;
        d = d ^ a; me.d = d = d << 8 ^ d >>> 24;
        me.c = c = c + d | 0;
        b = b ^ c;
        return me.b = (b << 7 ^ b >>> 25);
      }
      */

      me.a = 0;
      me.b = 0;
      me.c = 2654435769 | 0;
      me.d = 1367130551;

      if (seed === Math.floor(seed)) {
        // Integer seed.
        me.a = (seed / 0x100000000) | 0;
        me.b = seed | 0;
      } else {
        // String seed.
        strseed += seed;
      }

      // Mix in string seed, then discard an initial batch of 64 values.
      for (var k = 0; k < strseed.length + 20; k++) {
        me.b ^= strseed.charCodeAt(k) | 0;
        me.next();
      }
    }

    function copy(f, t) {
      t.a = f.a;
      t.b = f.b;
      t.c = f.c;
      t.d = f.d;
      return t;
    }
    function impl(seed, opts) {
      var xg = new XorGen(seed),
          state = opts && opts.state,
          prng = function() { return (xg.next() >>> 0) / 0x100000000; };
      prng.double = function() {
        do {
          var top = xg.next() >>> 11,
              bot = (xg.next() >>> 0) / 0x100000000,
              result = (top + bot) / (1 << 21);
        } while (result === 0);
        return result;
      };
      prng.int32 = xg.next;
      prng.quick = prng;
      if (state) {
        if (typeof(state) == 'object') copy(state, xg);
        prng.state = function() { return copy(xg, {}); };
      }
      return prng;
    }

    if (module && module.exports) {
      module.exports = impl;
    } else if (define && define.amd) {
      define(function() { return impl; });
    } else {
      this.tychei = impl;
    }

    })(
      commonjsGlobal,
      module,    // present in node.js
      (typeof undefined) == 'function'    // present with an AMD loader
    );
    });

    var _nodeResolve_empty = {};

    var _nodeResolve_empty$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': _nodeResolve_empty
    });

    var require$$0 = /*@__PURE__*/getAugmentedNamespace(_nodeResolve_empty$1);

    /*
    Copyright 2019 David Bau.

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

    */

    var seedrandom$1 = createCommonjsModule(function (module) {
    (function (global, pool, math) {
    //
    // The following constants are related to IEEE 754 limits.
    //

    var width = 256,        // each RC4 output is 0 <= x < 256
        chunks = 6,         // at least six RC4 outputs for each double
        digits = 52,        // there are 52 significant digits in a double
        rngname = 'random', // rngname: name for Math.random and Math.seedrandom
        startdenom = math.pow(width, chunks),
        significance = math.pow(2, digits),
        overflow = significance * 2,
        mask = width - 1,
        nodecrypto;         // node.js crypto module, initialized at the bottom.

    //
    // seedrandom()
    // This is the seedrandom function described above.
    //
    function seedrandom(seed, options, callback) {
      var key = [];
      options = (options == true) ? { entropy: true } : (options || {});

      // Flatten the seed string or build one from local entropy if needed.
      var shortseed = mixkey(flatten(
        options.entropy ? [seed, tostring(pool)] :
        (seed == null) ? autoseed() : seed, 3), key);

      // Use the seed to initialize an ARC4 generator.
      var arc4 = new ARC4(key);

      // This function returns a random double in [0, 1) that contains
      // randomness in every bit of the mantissa of the IEEE 754 value.
      var prng = function() {
        var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
            d = startdenom,                 //   and denominator d = 2 ^ 48.
            x = 0;                          //   and no 'extra last byte'.
        while (n < significance) {          // Fill up all significant digits by
          n = (n + x) * width;              //   shifting numerator and
          d *= width;                       //   denominator and generating a
          x = arc4.g(1);                    //   new least-significant-byte.
        }
        while (n >= overflow) {             // To avoid rounding up, before adding
          n /= 2;                           //   last byte, shift everything
          d /= 2;                           //   right using integer math until
          x >>>= 1;                         //   we have exactly the desired bits.
        }
        return (n + x) / d;                 // Form the number within [0, 1).
      };

      prng.int32 = function() { return arc4.g(4) | 0; };
      prng.quick = function() { return arc4.g(4) / 0x100000000; };
      prng.double = prng;

      // Mix the randomness into accumulated entropy.
      mixkey(tostring(arc4.S), pool);

      // Calling convention: what to return as a function of prng, seed, is_math.
      return (options.pass || callback ||
          function(prng, seed, is_math_call, state) {
            if (state) {
              // Load the arc4 state from the given state if it has an S array.
              if (state.S) { copy(state, arc4); }
              // Only provide the .state method if requested via options.state.
              prng.state = function() { return copy(arc4, {}); };
            }

            // If called as a method of Math (Math.seedrandom()), mutate
            // Math.random because that is how seedrandom.js has worked since v1.0.
            if (is_math_call) { math[rngname] = prng; return seed; }

            // Otherwise, it is a newer calling convention, so return the
            // prng directly.
            else return prng;
          })(
      prng,
      shortseed,
      'global' in options ? options.global : (this == math),
      options.state);
    }

    //
    // ARC4
    //
    // An ARC4 implementation.  The constructor takes a key in the form of
    // an array of at most (width) integers that should be 0 <= x < (width).
    //
    // The g(count) method returns a pseudorandom integer that concatenates
    // the next (count) outputs from ARC4.  Its return value is a number x
    // that is in the range 0 <= x < (width ^ count).
    //
    function ARC4(key) {
      var t, keylen = key.length,
          me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

      // The empty key [] is treated as [0].
      if (!keylen) { key = [keylen++]; }

      // Set up S using the standard key scheduling algorithm.
      while (i < width) {
        s[i] = i++;
      }
      for (i = 0; i < width; i++) {
        s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
        s[j] = t;
      }

      // The "g" method returns the next (count) outputs as one number.
      (me.g = function(count) {
        // Using instance members instead of closure state nearly doubles speed.
        var t, r = 0,
            i = me.i, j = me.j, s = me.S;
        while (count--) {
          t = s[i = mask & (i + 1)];
          r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
        }
        me.i = i; me.j = j;
        return r;
        // For robust unpredictability, the function call below automatically
        // discards an initial batch of values.  This is called RC4-drop[256].
        // See http://google.com/search?q=rsa+fluhrer+response&btnI
      })(width);
    }

    //
    // copy()
    // Copies internal state of ARC4 to or from a plain object.
    //
    function copy(f, t) {
      t.i = f.i;
      t.j = f.j;
      t.S = f.S.slice();
      return t;
    }
    //
    // flatten()
    // Converts an object tree to nested arrays of strings.
    //
    function flatten(obj, depth) {
      var result = [], typ = (typeof obj), prop;
      if (depth && typ == 'object') {
        for (prop in obj) {
          try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
        }
      }
      return (result.length ? result : typ == 'string' ? obj : obj + '\0');
    }

    //
    // mixkey()
    // Mixes a string seed into a key that is an array of integers, and
    // returns a shortened string seed that is equivalent to the result key.
    //
    function mixkey(seed, key) {
      var stringseed = seed + '', smear, j = 0;
      while (j < stringseed.length) {
        key[mask & j] =
          mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
      }
      return tostring(key);
    }

    //
    // autoseed()
    // Returns an object for autoseeding, using window.crypto and Node crypto
    // module if available.
    //
    function autoseed() {
      try {
        var out;
        if (nodecrypto && (out = nodecrypto.randomBytes)) {
          // The use of 'out' to remember randomBytes makes tight minified code.
          out = out(width);
        } else {
          out = new Uint8Array(width);
          (global.crypto || global.msCrypto).getRandomValues(out);
        }
        return tostring(out);
      } catch (e) {
        var browser = global.navigator,
            plugins = browser && browser.plugins;
        return [+new Date, global, plugins, global.screen, tostring(pool)];
      }
    }

    //
    // tostring()
    // Converts an array of charcodes to a string
    //
    function tostring(a) {
      return String.fromCharCode.apply(0, a);
    }

    //
    // When seedrandom.js is loaded, we immediately mix a few bits
    // from the built-in RNG into the entropy pool.  Because we do
    // not want to interfere with deterministic PRNG state later,
    // seedrandom will not call math.random on its own again after
    // initialization.
    //
    mixkey(math.random(), pool);

    //
    // Nodejs and AMD support: export the implementation as a module using
    // either convention.
    //
    if (module.exports) {
      module.exports = seedrandom;
      // When in node.js, try using crypto package for autoseeding.
      try {
        nodecrypto = require$$0;
      } catch (ex) {}
    } else {
      // When included as a plain script, set up Math.seedrandom global.
      math['seed' + rngname] = seedrandom;
    }


    // End anonymous scope, and pass initial values.
    })(
      // global: `self` in browsers (including strict mode and web workers),
      // otherwise `this` in Node and other environments
      (typeof self !== 'undefined') ? self : commonjsGlobal,
      [],     // pool: entropy pool starts empty
      Math    // math: package containing random, pow, and seedrandom
    );
    });

    // A library of seedable RNGs implemented in Javascript.
    //
    // Usage:
    //
    // var seedrandom = require('seedrandom');
    // var random = seedrandom(1); // or any seed.
    // var x = random();       // 0 <= x < 1.  Every bit is random.
    // var x = random.quick(); // 0 <= x < 1.  32 bits of randomness.

    // alea, a 53-bit multiply-with-carry generator by Johannes Baagøe.
    // Period: ~2^116
    // Reported to pass all BigCrush tests.


    // xor128, a pure xor-shift generator by George Marsaglia.
    // Period: 2^128-1.
    // Reported to fail: MatrixRank and LinearComp.


    // xorwow, George Marsaglia's 160-bit xor-shift combined plus weyl.
    // Period: 2^192-2^32
    // Reported to fail: CollisionOver, SimpPoker, and LinearComp.


    // xorshift7, by François Panneton and Pierre L'ecuyer, takes
    // a different approach: it adds robustness by allowing more shifts
    // than Marsaglia's original three.  It is a 7-shift generator
    // with 256 bits, that passes BigCrush with no systmatic failures.
    // Period 2^256-1.
    // No systematic BigCrush failures reported.


    // xor4096, by Richard Brent, is a 4096-bit xor-shift with a
    // very long period that also adds a Weyl generator. It also passes
    // BigCrush with no systematic failures.  Its long period may
    // be useful if you have many generators and need to avoid
    // collisions.
    // Period: 2^4128-2^32.
    // No systematic BigCrush failures reported.


    // Tyche-i, by Samuel Neves and Filipe Araujo, is a bit-shifting random
    // number generator derived from ChaCha, a modern stream cipher.
    // https://eden.dei.uc.pt/~sneves/pubs/2011-snfa2.pdf
    // Period: ~2^127
    // No systematic BigCrush failures reported.


    // The original ARC4-based prng included in this library.
    // Period: ~2^1600


    seedrandom$1.alea = alea;
    seedrandom$1.xor128 = xor128;
    seedrandom$1.xorwow = xorwow;
    seedrandom$1.xorshift7 = xorshift7;
    seedrandom$1.xor4096 = xor4096;
    seedrandom$1.tychei = tychei;

    var seedrandom = seedrandom$1;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



    var _owLite2$b = _interopRequireDefault$c(owLite);



    var _rng2$1 = _interopRequireDefault$c(rng);

    function _interopRequireDefault$c(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var RNGFunction = function (_RNG) {
      _inherits(RNGFunction, _RNG);

      function RNGFunction(thunk, opts) {
        _classCallCheck(this, RNGFunction);

        var _this = _possibleConstructorReturn(this, (RNGFunction.__proto__ || Object.getPrototypeOf(RNGFunction)).call(this));

        _this.seed(thunk, opts);
        return _this;
      }

      _createClass(RNGFunction, [{
        key: 'next',
        value: function next() {
          return this._rng();
        }
      }, {
        key: 'seed',
        value: function seed(thunk) {
          (0, _owLite2$b.default)(thunk, _owLite2$b.default.function);
          this._rng = thunk;
        }
      }, {
        key: 'clone',
        value: function clone() {
          for (var _len = arguments.length, opts = Array(_len), _key = 0; _key < _len; _key++) {
            opts[_key] = arguments[_key];
          }

          return new (Function.prototype.bind.apply(RNGFunction, [null].concat([this._rng], opts)))();
        }
      }, {
        key: 'name',
        get: function get() {
          return 'function';
        }
      }]);

      return RNGFunction;
    }(_rng2$1.default);

    var _default$e = RNGFunction;


    var _function = /*#__PURE__*/Object.defineProperty({
    	default: _default$e
    }, '__esModule', {value: true});

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };



    var _seedrandom2 = _interopRequireDefault$b(seedrandom);



    var _rng2 = _interopRequireDefault$b(rng);



    var _function2 = _interopRequireDefault$b(_function);

    function _interopRequireDefault$b(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

    var _default$d = function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var _args$ = args[0],
          arg0 = _args$ === undefined ? 'default' : _args$,
          rest = args.slice(1);


      switch (typeof arg0 === 'undefined' ? 'undefined' : _typeof(arg0)) {
        case 'object':
          if (arg0 instanceof _rng2.default) {
            return arg0;
          }
          break;

        case 'function':
          return new _function2.default(arg0);

        case 'string':
        case 'number':
          return new _function2.default(_seedrandom2.default.apply(undefined, _toConsumableArray(rest)));
      }

      throw new Error('invalid RNG "' + arg0 + '"');
    };


    var rngFactory = /*#__PURE__*/Object.defineProperty({
    	default: _default$d
    }, '__esModule', {value: true});

    var _owLite2$a = _interopRequireDefault$a(owLite);

    function _interopRequireDefault$a(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var _default$c = function (random, min, max) {
      if (max === undefined) {
        max = min === undefined ? 1 : min;
        min = 0;
      }

      (0, _owLite2$a.default)(min, _owLite2$a.default.number);
      (0, _owLite2$a.default)(max, _owLite2$a.default.number);

      return function () {
        return random.next() * (max - min) + min;
      };
    };


    var uniform = /*#__PURE__*/Object.defineProperty({
    	default: _default$c
    }, '__esModule', {value: true});

    var _owLite2$9 = _interopRequireDefault$9(owLite);

    function _interopRequireDefault$9(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var _default$b = function (random, min, max) {
      if (max === undefined) {
        max = min === undefined ? 1 : min;
        min = 0;
      }

      (0, _owLite2$9.default)(min, _owLite2$9.default.number.integer);
      (0, _owLite2$9.default)(max, _owLite2$9.default.number.integer);

      return function () {
        return random.next() * (max - min + 1) + min | 0;
      };
    };


    var uniformInt = /*#__PURE__*/Object.defineProperty({
    	default: _default$b
    }, '__esModule', {value: true});

    var _default$a = function (random) {
      return function () {
        return random.next() >= 0.5;
      };
    };


    var uniformBoolean = /*#__PURE__*/Object.defineProperty({
    	default: _default$a
    }, '__esModule', {value: true});

    var _owLite2$8 = _interopRequireDefault$8(owLite);

    function _interopRequireDefault$8(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var _default$9 = function (random) {
      var mu = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var sigma = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;

      (0, _owLite2$8.default)(mu, _owLite2$8.default.number);
      (0, _owLite2$8.default)(sigma, _owLite2$8.default.number);

      return function () {
        var x = void 0,
            y = void 0,
            r = void 0;

        do {
          x = random.next() * 2 - 1;
          y = random.next() * 2 - 1;
          r = x * x + y * y;
        } while (!r || r > 1);

        return mu + sigma * y * Math.sqrt(-2 * Math.log(r) / r);
      };
    };


    var normal = /*#__PURE__*/Object.defineProperty({
    	default: _default$9
    }, '__esModule', {value: true});

    var _default$8 = function (random) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var normal = random.normal.apply(random, args);

      return function () {
        return Math.exp(normal());
      };
    };


    var logNormal = /*#__PURE__*/Object.defineProperty({
    	default: _default$8
    }, '__esModule', {value: true});

    var _owLite2$7 = _interopRequireDefault$7(owLite);

    function _interopRequireDefault$7(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var _default$7 = function (random) {
      var p = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.5;

      (0, _owLite2$7.default)(p, _owLite2$7.default.number.gte(0).lt(1));

      return function () {
        return random.next() + p | 0;
      };
    };


    var bernoulli = /*#__PURE__*/Object.defineProperty({
    	default: _default$7
    }, '__esModule', {value: true});

    var _owLite2$6 = _interopRequireDefault$6(owLite);

    function _interopRequireDefault$6(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var _default$6 = function (random) {
      var n = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      var p = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0.5;

      (0, _owLite2$6.default)(n, _owLite2$6.default.number.positive.integer);
      (0, _owLite2$6.default)(p, _owLite2$6.default.number.gte(0).lte(1));

      return function () {
        var i = 0;
        var x = 0;

        while (i++ < n) {
          x += random.next() < p;
        }

        return x;
      };
    };


    var binomial = /*#__PURE__*/Object.defineProperty({
    	default: _default$6
    }, '__esModule', {value: true});

    var _owLite2$5 = _interopRequireDefault$5(owLite);

    function _interopRequireDefault$5(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var _default$5 = function (random) {
      var p = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.5;

      (0, _owLite2$5.default)(p, _owLite2$5.default.number.gt(0).lte(1));
      var invLogP = 1.0 / Math.log(1.0 - p);

      return function () {
        return 1 + Math.log(random.next()) * invLogP | 0;
      };
    };


    var geometric = /*#__PURE__*/Object.defineProperty({
    	default: _default$5
    }, '__esModule', {value: true});

    var _owLite2$4 = _interopRequireDefault$4(owLite);

    function _interopRequireDefault$4(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var logFactorialTable = [0.0, 0.0, 0.69314718055994529, 1.7917594692280550, 3.1780538303479458, 4.7874917427820458, 6.5792512120101012, 8.5251613610654147, 10.604602902745251, 12.801827480081469];

    var logFactorial = function logFactorial(k) {
      return logFactorialTable[k];
    };

    var logSqrt2PI = 0.91893853320467267;

    var _default$4 = function (random) {
      var lambda = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      (0, _owLite2$4.default)(lambda, _owLite2$4.default.number.positive);

      if (lambda < 10) {
        // inversion method
        var expMean = Math.exp(-lambda);

        return function () {
          var p = expMean;
          var x = 0;
          var u = random.next();

          while (u > p) {
            u = u - p;
            p = lambda * p / ++x;
          }

          return x;
        };
      } else {
        // generative method
        var smu = Math.sqrt(lambda);
        var b = 0.931 + 2.53 * smu;
        var a = -0.059 + 0.02483 * b;
        var invAlpha = 1.1239 + 1.1328 / (b - 3.4);
        var vR = 0.9277 - 3.6224 / (b - 2);

        return function () {
          while (true) {
            var u = void 0;
            var v = random.next();

            if (v <= 0.86 * vR) {
              u = v / vR - 0.43;
              return Math.floor((2 * a / (0.5 - Math.abs(u)) + b) * u + lambda + 0.445);
            }

            if (v >= vR) {
              u = random.next() - 0.5;
            } else {
              u = v / vR - 0.93;
              u = (u < 0 ? -0.5 : 0.5) - u;
              v = random.next() * vR;
            }

            var us = 0.5 - Math.abs(u);
            if (us < 0.013 && v > us) {
              continue;
            }

            var k = Math.floor((2 * a / us + b) * u + lambda + 0.445) | 0;
            v = v * invAlpha / (a / (us * us) + b);

            if (k >= 10) {
              var t = (k + 0.5) * Math.log(lambda / k) - lambda - logSqrt2PI + k - (1 / 12.0 - (1 / 360.0 - 1 / (1260.0 * k * k)) / (k * k)) / k;

              if (Math.log(v * smu) <= t) {
                return k;
              }
            } else if (k >= 0) {
              if (Math.log(v) <= k * Math.log(lambda) - lambda - logFactorial(k)) {
                return k;
              }
            }
          }
        };
      }
    };


    var poisson = /*#__PURE__*/Object.defineProperty({
    	default: _default$4
    }, '__esModule', {value: true});

    var _owLite2$3 = _interopRequireDefault$3(owLite);

    function _interopRequireDefault$3(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var _default$3 = function (random) {
      var lambda = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      (0, _owLite2$3.default)(lambda, _owLite2$3.default.number.positive);

      return function () {
        return -Math.log(1 - random.next()) / lambda;
      };
    };


    var exponential$1 = /*#__PURE__*/Object.defineProperty({
    	default: _default$3
    }, '__esModule', {value: true});

    var _owLite2$2 = _interopRequireDefault$2(owLite);

    function _interopRequireDefault$2(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var _default$2 = function (random) {
      var n = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      (0, _owLite2$2.default)(n, _owLite2$2.default.number.integer.gte(0));

      return function () {
        var sum = 0;
        for (var i = 0; i < n; ++i) {
          sum += random.next();
        }

        return sum;
      };
    };


    var irwinHall = /*#__PURE__*/Object.defineProperty({
    	default: _default$2
    }, '__esModule', {value: true});

    var _owLite2$1 = _interopRequireDefault$1(owLite);

    function _interopRequireDefault$1(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var _default$1 = function (random) {
      var n = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      (0, _owLite2$1.default)(n, _owLite2$1.default.number.integer.positive);
      var irwinHall = random.irwinHall(n);

      return function () {
        return irwinHall() / n;
      };
    };


    var bates = /*#__PURE__*/Object.defineProperty({
    	default: _default$1
    }, '__esModule', {value: true});

    var _owLite2 = _interopRequireDefault(owLite);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var _default = function (random) {
      var alpha = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      (0, _owLite2.default)(alpha, _owLite2.default.number.gte(0));
      var invAlpha = 1.0 / alpha;

      return function () {
        return 1.0 / Math.pow(1.0 - random.next(), invAlpha);
      };
    };


    var pareto = /*#__PURE__*/Object.defineProperty({
    	default: _default
    }, '__esModule', {value: true});

    var random$1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.RNGFactory = exports.RNG = undefined;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



    var _owLite2 = _interopRequireDefault(owLite);



    var _rng2 = _interopRequireDefault(rng);



    var _rngFactory2 = _interopRequireDefault(rngFactory);



    var _uniform3 = _interopRequireDefault(uniform);



    var _uniformInt3 = _interopRequireDefault(uniformInt);



    var _uniformBoolean3 = _interopRequireDefault(uniformBoolean);



    var _normal3 = _interopRequireDefault(normal);



    var _logNormal3 = _interopRequireDefault(logNormal);



    var _bernoulli3 = _interopRequireDefault(bernoulli);



    var _binomial3 = _interopRequireDefault(binomial);



    var _geometric3 = _interopRequireDefault(geometric);



    var _poisson3 = _interopRequireDefault(poisson);



    var _exponential3 = _interopRequireDefault(exponential$1);



    var _irwinHall3 = _interopRequireDefault(irwinHall);



    var _bates3 = _interopRequireDefault(bates);



    var _pareto3 = _interopRequireDefault(pareto);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    exports.RNG = _rng2.default;
    exports.RNGFactory = _rngFactory2.default;

    /**
     * Seedable random number generator supporting many common distributions.
     *
     * Defaults to Math.random as its underlying pseudorandom number generator.
     *
     * @name Random
     * @class
     *
     * @param {RNG|function} [rng=Math.random] - Underlying pseudorandom number generator.
     */

    var Random = function () {
      function Random(rng) {
        _classCallCheck(this, Random);

        if (rng) (0, _owLite2.default)(rng, _owLite2.default.object.instanceOf(_rng2.default));

        this._cache = {};
        this.use(rng);
      }

      /**
       * @member {RNG} Underlying pseudo-random number generator
       */


      _createClass(Random, [{
        key: 'clone',


        /**
         * Creates a new `Random` instance, optionally specifying parameters to
         * set a new seed.
         *
         * @see RNG.clone
         *
         * @param {string} [seed] - Optional seed for new RNG.
         * @param {object} [opts] - Optional config for new RNG options.
         * @return {Random}
         */
        value: function clone() {
          if (arguments.length) {
            return new Random(_rngFactory2.default.apply(undefined, arguments));
          } else {
            return new Random(this.rng.clone());
          }
        }

        /**
         * Sets the underlying pseudorandom number generator used via
         * either an instance of `seedrandom`, a custom instance of RNG
         * (for PRNG plugins), or a string specifying the PRNG to use
         * along with an optional `seed` and `opts` to initialize the
         * RNG.
         *
         * @example
         * const random = require('random')
         *
         * random.use('example_seedrandom_string')
         * // or
         * random.use(seedrandom('kittens'))
         * // or
         * random.use(Math.random)
         *
         * @param {...*} args
         */

      }, {
        key: 'use',
        value: function use() {
          this._rng = _rngFactory2.default.apply(undefined, arguments);
        }

        /**
         * Patches `Math.random` with this Random instance's PRNG.
         */

      }, {
        key: 'patch',
        value: function patch() {
          if (this._patch) {
            throw new Error('Math.random already patched');
          }

          this._patch = Math.random;
          Math.random = this.uniform();
        }

        /**
         * Restores a previously patched `Math.random` to its original value.
         */

      }, {
        key: 'unpatch',
        value: function unpatch() {
          if (this._patch) {
            Math.random = this._patch;
            delete this._patch;
          }
        }

        // --------------------------------------------------------------------------
        // Uniform utility functions
        // --------------------------------------------------------------------------

        /**
         * Convenience wrapper around `this.rng.next()`
         *
         * Returns a floating point number in [0, 1).
         *
         * @return {number}
         */

      }, {
        key: 'next',
        value: function next() {
          return this._rng.next();
        }

        /**
         * Samples a uniform random floating point number, optionally specifying
         * lower and upper bounds.
         *
         * Convence wrapper around `random.uniform()`
         *
         * @param {number} [min=0] - Lower bound (float, inclusive)
         * @param {number} [max=1] - Upper bound (float, exclusive)
         * @return {number}
         */

      }, {
        key: 'float',
        value: function float(min, max) {
          return this.uniform(min, max)();
        }

        /**
         * Samples a uniform random integer, optionally specifying lower and upper
         * bounds.
         *
         * Convence wrapper around `random.uniformInt()`
         *
         * @param {number} [min=0] - Lower bound (integer, inclusive)
         * @param {number} [max=1] - Upper bound (integer, inclusive)
         * @return {number}
         */

      }, {
        key: 'int',
        value: function int(min, max) {
          return this.uniformInt(min, max)();
        }

        /**
         * Samples a uniform random integer, optionally specifying lower and upper
         * bounds.
         *
         * Convence wrapper around `random.uniformInt()`
         *
         * @alias `random.int`
         *
         * @param {number} [min=0] - Lower bound (integer, inclusive)
         * @param {number} [max=1] - Upper bound (integer, inclusive)
         * @return {number}
         */

      }, {
        key: 'integer',
        value: function integer(min, max) {
          return this.uniformInt(min, max)();
        }

        /**
         * Samples a uniform random boolean value.
         *
         * Convence wrapper around `random.uniformBoolean()`
         *
         * @alias `random.boolean`
         *
         * @return {boolean}
         */

      }, {
        key: 'bool',
        value: function bool() {
          return this.uniformBoolean()();
        }

        /**
         * Samples a uniform random boolean value.
         *
         * Convence wrapper around `random.uniformBoolean()`
         *
         * @return {boolean}
         */

      }, {
        key: 'boolean',
        value: function boolean() {
          return this.uniformBoolean()();
        }

        // --------------------------------------------------------------------------
        // Uniform distributions
        // --------------------------------------------------------------------------

        /**
         * Generates a [Continuous uniform distribution](https://en.wikipedia.org/wiki/Uniform_distribution_(continuous)).
         *
         * @param {number} [min=0] - Lower bound (float, inclusive)
         * @param {number} [max=1] - Upper bound (float, exclusive)
         * @return {function}
         */

      }, {
        key: 'uniform',
        value: function uniform(min, max) {
          return this._memoize('uniform', _uniform3.default, min, max);
        }

        /**
         * Generates a [Discrete uniform distribution](https://en.wikipedia.org/wiki/Discrete_uniform_distribution).
         *
         * @param {number} [min=0] - Lower bound (integer, inclusive)
         * @param {number} [max=1] - Upper bound (integer, inclusive)
         * @return {function}
         */

      }, {
        key: 'uniformInt',
        value: function uniformInt(min, max) {
          return this._memoize('uniformInt', _uniformInt3.default, min, max);
        }

        /**
         * Generates a [Discrete uniform distribution](https://en.wikipedia.org/wiki/Discrete_uniform_distribution),
         * with two possible outcomes, `true` or `false.
         *
         * This method is analogous to flipping a coin.
         *
         * @return {function}
         */

      }, {
        key: 'uniformBoolean',
        value: function uniformBoolean() {
          return this._memoize('uniformBoolean', _uniformBoolean3.default);
        }

        // --------------------------------------------------------------------------
        // Normal distributions
        // --------------------------------------------------------------------------

        /**
         * Generates a [Normal distribution](https://en.wikipedia.org/wiki/Normal_distribution).
         *
         * @param {number} [mu=0] - Mean
         * @param {number} [sigma=1] - Standard deviation
         * @return {function}
         */

      }, {
        key: 'normal',
        value: function normal(mu, sigma) {
          return (0, _normal3.default)(this, mu, sigma);
        }

        /**
         * Generates a [Log-normal distribution](https://en.wikipedia.org/wiki/Log-normal_distribution).
         *
         * @param {number} [mu=0] - Mean of underlying normal distribution
         * @param {number} [sigma=1] - Standard deviation of underlying normal distribution
         * @return {function}
         */

      }, {
        key: 'logNormal',
        value: function logNormal(mu, sigma) {
          return (0, _logNormal3.default)(this, mu, sigma);
        }

        // --------------------------------------------------------------------------
        // Bernoulli distributions
        // --------------------------------------------------------------------------

        /**
         * Generates a [Bernoulli distribution](https://en.wikipedia.org/wiki/Bernoulli_distribution).
         *
         * @param {number} [p=0.5] - Success probability of each trial.
         * @return {function}
         */

      }, {
        key: 'bernoulli',
        value: function bernoulli(p) {
          return (0, _bernoulli3.default)(this, p);
        }

        /**
         * Generates a [Binomial distribution](https://en.wikipedia.org/wiki/Binomial_distribution).
         *
         * @param {number} [n=1] - Number of trials.
         * @param {number} [p=0.5] - Success probability of each trial.
         * @return {function}
         */

      }, {
        key: 'binomial',
        value: function binomial(n, p) {
          return (0, _binomial3.default)(this, n, p);
        }

        /**
         * Generates a [Geometric distribution](https://en.wikipedia.org/wiki/Geometric_distribution).
         *
         * @param {number} [p=0.5] - Success probability of each trial.
         * @return {function}
         */

      }, {
        key: 'geometric',
        value: function geometric(p) {
          return (0, _geometric3.default)(this, p);
        }

        // --------------------------------------------------------------------------
        // Poisson distributions
        // --------------------------------------------------------------------------

        /**
         * Generates a [Poisson distribution](https://en.wikipedia.org/wiki/Poisson_distribution).
         *
         * @param {number} [lambda=1] - Mean (lambda > 0)
         * @return {function}
         */

      }, {
        key: 'poisson',
        value: function poisson(lambda) {
          return (0, _poisson3.default)(this, lambda);
        }

        /**
         * Generates an [Exponential distribution](https://en.wikipedia.org/wiki/Exponential_distribution).
         *
         * @param {number} [lambda=1] - Inverse mean (lambda > 0)
         * @return {function}
         */

      }, {
        key: 'exponential',
        value: function exponential(lambda) {
          return (0, _exponential3.default)(this, lambda);
        }

        // --------------------------------------------------------------------------
        // Misc distributions
        // --------------------------------------------------------------------------

        /**
         * Generates an [Irwin Hall distribution](https://en.wikipedia.org/wiki/Irwin%E2%80%93Hall_distribution).
         *
         * @param {number} [n=1] - Number of uniform samples to sum (n >= 0)
         * @return {function}
         */

      }, {
        key: 'irwinHall',
        value: function irwinHall(n) {
          return (0, _irwinHall3.default)(this, n);
        }

        /**
         * Generates a [Bates distribution](https://en.wikipedia.org/wiki/Bates_distribution).
         *
         * @param {number} [n=1] - Number of uniform samples to average (n >= 1)
         * @return {function}
         */

      }, {
        key: 'bates',
        value: function bates(n) {
          return (0, _bates3.default)(this, n);
        }

        /**
         * Generates a [Pareto distribution](https://en.wikipedia.org/wiki/Pareto_distribution).
         *
         * @param {number} [alpha=1] - Alpha
         * @return {function}
         */

      }, {
        key: 'pareto',
        value: function pareto(alpha) {
          return (0, _pareto3.default)(this, alpha);
        }

        // --------------------------------------------------------------------------
        // Internal
        // --------------------------------------------------------------------------

        /**
         * Memoizes distributions to ensure they're only created when necessary.
         *
         * Returns a thunk which that returns independent, identically distributed
         * samples from the specified distribution.
         *
         * @private
         *
         * @param {string} label - Name of distribution
         * @param {function} getter - Function which generates a new distribution
         * @param {...*} args - Distribution-specific arguments
         *
         * @return {function}
         */

      }, {
        key: '_memoize',
        value: function _memoize(label, getter) {
          for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
            args[_key - 2] = arguments[_key];
          }

          var key = '' + args.join(';');
          var value = this._cache[label];

          if (value === undefined || value.key !== key) {
            value = { key: key, distribution: getter.apply(undefined, [this].concat(args)) };
            this._cache[label] = value;
          }

          return value.distribution;
        }
      }, {
        key: 'rng',
        get: function get() {
          return this._rng;
        }
      }]);

      return Random;
    }();

    // defaults to Math.random as its RNG


    exports.default = new Random();

    });

    var random = random$1.default;

    class Gaussian {
      constructor(mean, cov) {
        // TODO: Consider saving the dimension
        if ((mean instanceof Matrix) && (cov instanceof Matrix)) {
          this.mean = mean;
          this.cov = cov;
        } else {
          this.mean = new Matrix([mean]).transpose();
          this.cov = new Matrix(cov);
        }
      }

      at(x) {
        const diff = (new Matrix([x])).transpose().sub(this.mean);
        const n = diff.transpose().mmul(inverse(this.cov)).mmul(diff).mul(-0.5).exp();
        const d = Math.sqrt(Math.pow(2*Math.PI, this.mean.rows)*this.cov.det());
        return (n * (1 / d));
      }

      // idx is the first row of b
      marginalize(idx) {
        // FIXME: Rewrite with Array.slice() for speed
        const aMean = sliceMat(this.mean,0,0,idx,1);
        const bMean = sliceMat(this.mean,idx,0,this.mean.rows,1);
        const aCov = sliceMat(this.cov,0,0,idx,idx);
        const bCov = sliceMat(this.cov,idx,idx,this.mean.rows,this.mean.rows);
        return [new Gaussian(aMean, aCov), new Gaussian(bMean, bCov)];
      }

      // Also refer to: https://stats.stackexchange.com/questions/232959/simulating-the-posterior-of-a-gaussian-process
      // FIXME: Currently only works with \mu_e = 0
      condition(X) {
        const idx = X.length;
        const x0 = new Matrix([X]).transpose();
        const Exx = sliceMat(this.cov,0,0,idx,idx);
        const Exy = sliceMat(this.cov,0,idx,idx,this.mean.rows);
        const Eyx = Exy.transpose();
        const Eyy = sliceMat(this.cov,idx,idx,this.mean.rows,this.mean.rows);

        // Compute new zero
        const Lxx = new CholeskyDecomposition(Exx).lowerTriangularMatrix;
        const mLy = solve(Lxx, x0);
        const Lk = solve(Lxx, Exy);
        const condMean = Lk.transpose().mmul(mLy); // Hack

        // FIXME: Make this more performant (use cholesky and slove instead of inverse)
        const condCov = Eyy.sub(Eyx.mmul(inverse(Exx)).mmul(Exy));
        return new Gaussian(condMean, condCov);
      }

      // Uses Eigenvalue decomposition to compute t from Cov = tt^T
      transformationMatrix() {
        const e = new EigenvalueDecomposition(this.cov);
        const r = e.eigenvectorMatrix;
        const d = Matrix.zeros(r.rows, r.columns);
        for(let i = 0; i < d.rows; ++i) {
          d.set(i,i, Math.sqrt(e.realEigenvalues[i]));
        }
        return r.mmul(d);
      }

      sample() {
        const z = Matrix.zeros(this.mean.rows, 1);
        const normal = random.normal();
        for(let i = 0; i < this.mean.rows; ++i)
          z.set(i,0,normal());

        const samples = Matrix.add(this.mean, this.transformationMatrix().mmul(z));
        return samples;
      }

      getMean() {
        return this.mean.transpose()[0];
      }

      getSd() {
        return this.cov.diag().map(s2 => Math.sqrt(s2));
      }
    }

    // ranges from [i1,i2) & [j1,j2)
    function sliceMat(mat,i1,j1,i2,j2) {
      const result = new Matrix(i2-i1,j2-j1);
      for(let i = i1; i < i2; ++i) 
        for(let j = j1; j < j2; ++j) {
          result.set(i-i1, j-j1, mat.get(i,j)); 
        }
      return result;
    }

    class RBFKernel {
      constructor() {
        this.g = new Gaussian([0], [[1]]);
        this.scale = 1.0 / this.g.at([0]);
      }

      call(x1, x2) {
        return this.g.at([x1 - x2]) * this.scale;
      }

      // find +x solving call(0, x) = y
      inv0(y) {
        var sigma2 = this.get_sigma2();
        var ys = y / this.scale;
        const sspi = Math.sqrt(sigma2 * 2.0 * Math.PI);
        const dssq = -2.0 * sigma2; 
        var x = Math.sqrt(dssq * Math.log(ys * sspi));
        return x;
      }

      set_sigma(sigma) {
        this.g = new Gaussian([0], [[sigma * sigma]]);
        this.scale = 1.0 / this.g.at([0]);
      }

      get_sigma2() {
        return this.g.cov[0][0];
      }

      cuts(x, beg, end) {
        return [];
      }
    }

    class RBFShuffleKernel {
      constructor(cut_size) {
        this.g = new Gaussian([0], [[1]]);
        this.scale = 1.0 / this.g.at([0]);
        this.cut_size = cut_size;
      }

      call(x1, x2) {
        var c = this.cut_size;
        var d = Math.floor(x2 / c);
        var r = x2 - d * c;
        if (Math.abs(d % 2) == 1) 
          x2 += c - 2 * r;

        return this.g.at([x2 - x1]) * this.scale;
      }

      set_sigma(sigma) {
        this.g = new Gaussian([0], [[sigma * sigma]]);
        this.scale = 1.0 / this.g.at([0]);
      }

      get_sigma2() {
        return this.g.cov[0][0];
      }

      // return a list of points of discontinuity in [beg, end] for the
      // representer function of x
      cuts(x, beg, end) {
        var s = beg; 
        var p = [];
        while (s < end) {
          p.push(s);
          s += this.cut_size;
        }
        return p;
      }
    }

    function ascending(a, b) {
      return a == null || b == null ? NaN
        : a < b ? -1
        : a > b ? 1
        : a >= b ? 0
        : NaN;
    }

    function bisector(f) {
      let delta = f;
      let compare = f;

      if (f.length === 1) {
        delta = (d, x) => f(d) - x;
        compare = ascendingComparator(f);
      }

      function left(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          const mid = (lo + hi) >>> 1;
          if (compare(a[mid], x) < 0) lo = mid + 1;
          else hi = mid;
        }
        return lo;
      }

      function right(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          const mid = (lo + hi) >>> 1;
          if (compare(a[mid], x) > 0) hi = mid;
          else lo = mid + 1;
        }
        return lo;
      }

      function center(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        const i = left(a, x, lo, hi - 1);
        return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
      }

      return {left, center, right};
    }

    function ascendingComparator(f) {
      return (d, x) => ascending(f(d), x);
    }

    function number$1(x) {
      return x === null ? NaN : +x;
    }

    const ascendingBisect = bisector(ascending);
    const bisectRight = ascendingBisect.right;
    bisector(number$1).center;

    var e10 = Math.sqrt(50),
        e5 = Math.sqrt(10),
        e2 = Math.sqrt(2);

    function ticks(start, stop, count) {
      var reverse,
          i = -1,
          n,
          ticks,
          step;

      stop = +stop, start = +start, count = +count;
      if (start === stop && count > 0) return [start];
      if (reverse = stop < start) n = start, start = stop, stop = n;
      if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

      if (step > 0) {
        let r0 = Math.round(start / step), r1 = Math.round(stop / step);
        if (r0 * step < start) ++r0;
        if (r1 * step > stop) --r1;
        ticks = new Array(n = r1 - r0 + 1);
        while (++i < n) ticks[i] = (r0 + i) * step;
      } else {
        step = -step;
        let r0 = Math.round(start * step), r1 = Math.round(stop * step);
        if (r0 / step < start) ++r0;
        if (r1 / step > stop) --r1;
        ticks = new Array(n = r1 - r0 + 1);
        while (++i < n) ticks[i] = (r0 + i) / step;
      }

      if (reverse) ticks.reverse();

      return ticks;
    }

    function tickIncrement(start, stop, count) {
      var step = (stop - start) / Math.max(0, count),
          power = Math.floor(Math.log(step) / Math.LN10),
          error = step / Math.pow(10, power);
      return power >= 0
          ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
          : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
    }

    function tickStep(start, stop, count) {
      var step0 = Math.abs(stop - start) / Math.max(0, count),
          step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
          error = step0 / step1;
      if (error >= e10) step1 *= 10;
      else if (error >= e5) step1 *= 5;
      else if (error >= e2) step1 *= 2;
      return stop < start ? -step1 : step1;
    }

    function min(values, valueof) {
      let min;
      if (valueof === undefined) {
        for (const value of values) {
          if (value != null
              && (min > value || (min === undefined && value >= value))) {
            min = value;
          }
        }
      } else {
        let index = -1;
        for (let value of values) {
          if ((value = valueof(value, ++index, values)) != null
              && (min > value || (min === undefined && value >= value))) {
            min = value;
          }
        }
      }
      return min;
    }

    function range(start, stop, step) {
      start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

      var i = -1,
          n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
          range = new Array(n);

      while (++i < n) {
        range[i] = start + i * step;
      }

      return range;
    }

    function transpose(matrix) {
      if (!(n = matrix.length)) return [];
      for (var i = -1, m = min(matrix, length), transpose = new Array(m); ++i < m;) {
        for (var j = -1, n, row = transpose[i] = new Array(n); ++j < n;) {
          row[j] = matrix[j][i];
        }
      }
      return transpose;
    }

    function length(d) {
      return d.length;
    }

    function zip() {
      return transpose(arguments);
    }

    function define(constructor, factory, prototype) {
      constructor.prototype = factory.prototype = prototype;
      prototype.constructor = constructor;
    }

    function extend(parent, definition) {
      var prototype = Object.create(parent.prototype);
      for (var key in definition) prototype[key] = definition[key];
      return prototype;
    }

    function Color() {}

    var darker = 0.7;
    var brighter = 1 / darker;

    var reI = "\\s*([+-]?\\d+)\\s*",
        reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
        reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
        reHex = /^#([0-9a-f]{3,8})$/,
        reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
        reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
        reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
        reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
        reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
        reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

    var named = {
      aliceblue: 0xf0f8ff,
      antiquewhite: 0xfaebd7,
      aqua: 0x00ffff,
      aquamarine: 0x7fffd4,
      azure: 0xf0ffff,
      beige: 0xf5f5dc,
      bisque: 0xffe4c4,
      black: 0x000000,
      blanchedalmond: 0xffebcd,
      blue: 0x0000ff,
      blueviolet: 0x8a2be2,
      brown: 0xa52a2a,
      burlywood: 0xdeb887,
      cadetblue: 0x5f9ea0,
      chartreuse: 0x7fff00,
      chocolate: 0xd2691e,
      coral: 0xff7f50,
      cornflowerblue: 0x6495ed,
      cornsilk: 0xfff8dc,
      crimson: 0xdc143c,
      cyan: 0x00ffff,
      darkblue: 0x00008b,
      darkcyan: 0x008b8b,
      darkgoldenrod: 0xb8860b,
      darkgray: 0xa9a9a9,
      darkgreen: 0x006400,
      darkgrey: 0xa9a9a9,
      darkkhaki: 0xbdb76b,
      darkmagenta: 0x8b008b,
      darkolivegreen: 0x556b2f,
      darkorange: 0xff8c00,
      darkorchid: 0x9932cc,
      darkred: 0x8b0000,
      darksalmon: 0xe9967a,
      darkseagreen: 0x8fbc8f,
      darkslateblue: 0x483d8b,
      darkslategray: 0x2f4f4f,
      darkslategrey: 0x2f4f4f,
      darkturquoise: 0x00ced1,
      darkviolet: 0x9400d3,
      deeppink: 0xff1493,
      deepskyblue: 0x00bfff,
      dimgray: 0x696969,
      dimgrey: 0x696969,
      dodgerblue: 0x1e90ff,
      firebrick: 0xb22222,
      floralwhite: 0xfffaf0,
      forestgreen: 0x228b22,
      fuchsia: 0xff00ff,
      gainsboro: 0xdcdcdc,
      ghostwhite: 0xf8f8ff,
      gold: 0xffd700,
      goldenrod: 0xdaa520,
      gray: 0x808080,
      green: 0x008000,
      greenyellow: 0xadff2f,
      grey: 0x808080,
      honeydew: 0xf0fff0,
      hotpink: 0xff69b4,
      indianred: 0xcd5c5c,
      indigo: 0x4b0082,
      ivory: 0xfffff0,
      khaki: 0xf0e68c,
      lavender: 0xe6e6fa,
      lavenderblush: 0xfff0f5,
      lawngreen: 0x7cfc00,
      lemonchiffon: 0xfffacd,
      lightblue: 0xadd8e6,
      lightcoral: 0xf08080,
      lightcyan: 0xe0ffff,
      lightgoldenrodyellow: 0xfafad2,
      lightgray: 0xd3d3d3,
      lightgreen: 0x90ee90,
      lightgrey: 0xd3d3d3,
      lightpink: 0xffb6c1,
      lightsalmon: 0xffa07a,
      lightseagreen: 0x20b2aa,
      lightskyblue: 0x87cefa,
      lightslategray: 0x778899,
      lightslategrey: 0x778899,
      lightsteelblue: 0xb0c4de,
      lightyellow: 0xffffe0,
      lime: 0x00ff00,
      limegreen: 0x32cd32,
      linen: 0xfaf0e6,
      magenta: 0xff00ff,
      maroon: 0x800000,
      mediumaquamarine: 0x66cdaa,
      mediumblue: 0x0000cd,
      mediumorchid: 0xba55d3,
      mediumpurple: 0x9370db,
      mediumseagreen: 0x3cb371,
      mediumslateblue: 0x7b68ee,
      mediumspringgreen: 0x00fa9a,
      mediumturquoise: 0x48d1cc,
      mediumvioletred: 0xc71585,
      midnightblue: 0x191970,
      mintcream: 0xf5fffa,
      mistyrose: 0xffe4e1,
      moccasin: 0xffe4b5,
      navajowhite: 0xffdead,
      navy: 0x000080,
      oldlace: 0xfdf5e6,
      olive: 0x808000,
      olivedrab: 0x6b8e23,
      orange: 0xffa500,
      orangered: 0xff4500,
      orchid: 0xda70d6,
      palegoldenrod: 0xeee8aa,
      palegreen: 0x98fb98,
      paleturquoise: 0xafeeee,
      palevioletred: 0xdb7093,
      papayawhip: 0xffefd5,
      peachpuff: 0xffdab9,
      peru: 0xcd853f,
      pink: 0xffc0cb,
      plum: 0xdda0dd,
      powderblue: 0xb0e0e6,
      purple: 0x800080,
      rebeccapurple: 0x663399,
      red: 0xff0000,
      rosybrown: 0xbc8f8f,
      royalblue: 0x4169e1,
      saddlebrown: 0x8b4513,
      salmon: 0xfa8072,
      sandybrown: 0xf4a460,
      seagreen: 0x2e8b57,
      seashell: 0xfff5ee,
      sienna: 0xa0522d,
      silver: 0xc0c0c0,
      skyblue: 0x87ceeb,
      slateblue: 0x6a5acd,
      slategray: 0x708090,
      slategrey: 0x708090,
      snow: 0xfffafa,
      springgreen: 0x00ff7f,
      steelblue: 0x4682b4,
      tan: 0xd2b48c,
      teal: 0x008080,
      thistle: 0xd8bfd8,
      tomato: 0xff6347,
      turquoise: 0x40e0d0,
      violet: 0xee82ee,
      wheat: 0xf5deb3,
      white: 0xffffff,
      whitesmoke: 0xf5f5f5,
      yellow: 0xffff00,
      yellowgreen: 0x9acd32
    };

    define(Color, color, {
      copy: function(channels) {
        return Object.assign(new this.constructor, this, channels);
      },
      displayable: function() {
        return this.rgb().displayable();
      },
      hex: color_formatHex, // Deprecated! Use color.formatHex.
      formatHex: color_formatHex,
      formatHsl: color_formatHsl,
      formatRgb: color_formatRgb,
      toString: color_formatRgb
    });

    function color_formatHex() {
      return this.rgb().formatHex();
    }

    function color_formatHsl() {
      return hslConvert(this).formatHsl();
    }

    function color_formatRgb() {
      return this.rgb().formatRgb();
    }

    function color(format) {
      var m, l;
      format = (format + "").trim().toLowerCase();
      return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
          : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
          : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
          : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
          : null) // invalid hex
          : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
          : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
          : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
          : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
          : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
          : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
          : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
          : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
          : null;
    }

    function rgbn(n) {
      return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
    }

    function rgba(r, g, b, a) {
      if (a <= 0) r = g = b = NaN;
      return new Rgb(r, g, b, a);
    }

    function rgbConvert(o) {
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Rgb;
      o = o.rgb();
      return new Rgb(o.r, o.g, o.b, o.opacity);
    }

    function rgb(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define(Rgb, rgb, extend(Color, {
      brighter: function(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      darker: function(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      rgb: function() {
        return this;
      },
      displayable: function() {
        return (-0.5 <= this.r && this.r < 255.5)
            && (-0.5 <= this.g && this.g < 255.5)
            && (-0.5 <= this.b && this.b < 255.5)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      hex: rgb_formatHex, // Deprecated! Use color.formatHex.
      formatHex: rgb_formatHex,
      formatRgb: rgb_formatRgb,
      toString: rgb_formatRgb
    }));

    function rgb_formatHex() {
      return "#" + hex(this.r) + hex(this.g) + hex(this.b);
    }

    function rgb_formatRgb() {
      var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
      return (a === 1 ? "rgb(" : "rgba(")
          + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
          + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
          + Math.max(0, Math.min(255, Math.round(this.b) || 0))
          + (a === 1 ? ")" : ", " + a + ")");
    }

    function hex(value) {
      value = Math.max(0, Math.min(255, Math.round(value) || 0));
      return (value < 16 ? "0" : "") + value.toString(16);
    }

    function hsla(h, s, l, a) {
      if (a <= 0) h = s = l = NaN;
      else if (l <= 0 || l >= 1) h = s = NaN;
      else if (s <= 0) h = NaN;
      return new Hsl(h, s, l, a);
    }

    function hslConvert(o) {
      if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Hsl;
      if (o instanceof Hsl) return o;
      o = o.rgb();
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          h = NaN,
          s = max - min,
          l = (max + min) / 2;
      if (s) {
        if (r === max) h = (g - b) / s + (g < b) * 6;
        else if (g === max) h = (b - r) / s + 2;
        else h = (r - g) / s + 4;
        s /= l < 0.5 ? max + min : 2 - max - min;
        h *= 60;
      } else {
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new Hsl(h, s, l, o.opacity);
    }

    function hsl(h, s, l, opacity) {
      return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
    }

    function Hsl(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define(Hsl, hsl, extend(Color, {
      brighter: function(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      darker: function(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      rgb: function() {
        var h = this.h % 360 + (this.h < 0) * 360,
            s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
            l = this.l,
            m2 = l + (l < 0.5 ? l : 1 - l) * s,
            m1 = 2 * l - m2;
        return new Rgb(
          hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
          hsl2rgb(h, m1, m2),
          hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
          this.opacity
        );
      },
      displayable: function() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s))
            && (0 <= this.l && this.l <= 1)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      formatHsl: function() {
        var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
        return (a === 1 ? "hsl(" : "hsla(")
            + (this.h || 0) + ", "
            + (this.s || 0) * 100 + "%, "
            + (this.l || 0) * 100 + "%"
            + (a === 1 ? ")" : ", " + a + ")");
      }
    }));

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60
          : h < 180 ? m2
          : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
          : m1) * 255;
    }

    var constant$1 = x => () => x;

    function linear$1(a, d) {
      return function(t) {
        return a + t * d;
      };
    }

    function exponential(a, b, y) {
      return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
        return Math.pow(a + t * b, y);
      };
    }

    function gamma(y) {
      return (y = +y) === 1 ? nogamma : function(a, b) {
        return b - a ? exponential(a, b, y) : constant$1(isNaN(a) ? b : a);
      };
    }

    function nogamma(a, b) {
      var d = b - a;
      return d ? linear$1(a, d) : constant$1(isNaN(a) ? b : a);
    }

    var interpolateRgb = (function rgbGamma(y) {
      var color = gamma(y);

      function rgb$1(start, end) {
        var r = color((start = rgb(start)).r, (end = rgb(end)).r),
            g = color(start.g, end.g),
            b = color(start.b, end.b),
            opacity = nogamma(start.opacity, end.opacity);
        return function(t) {
          start.r = r(t);
          start.g = g(t);
          start.b = b(t);
          start.opacity = opacity(t);
          return start + "";
        };
      }

      rgb$1.gamma = rgbGamma;

      return rgb$1;
    })(1);

    function numberArray(a, b) {
      if (!b) b = [];
      var n = a ? Math.min(b.length, a.length) : 0,
          c = b.slice(),
          i;
      return function(t) {
        for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
        return c;
      };
    }

    function isNumberArray(x) {
      return ArrayBuffer.isView(x) && !(x instanceof DataView);
    }

    function genericArray(a, b) {
      var nb = b ? b.length : 0,
          na = a ? Math.min(nb, a.length) : 0,
          x = new Array(na),
          c = new Array(nb),
          i;

      for (i = 0; i < na; ++i) x[i] = interpolate(a[i], b[i]);
      for (; i < nb; ++i) c[i] = b[i];

      return function(t) {
        for (i = 0; i < na; ++i) c[i] = x[i](t);
        return c;
      };
    }

    function date(a, b) {
      var d = new Date;
      return a = +a, b = +b, function(t) {
        return d.setTime(a * (1 - t) + b * t), d;
      };
    }

    function interpolateNumber(a, b) {
      return a = +a, b = +b, function(t) {
        return a * (1 - t) + b * t;
      };
    }

    function object(a, b) {
      var i = {},
          c = {},
          k;

      if (a === null || typeof a !== "object") a = {};
      if (b === null || typeof b !== "object") b = {};

      for (k in b) {
        if (k in a) {
          i[k] = interpolate(a[k], b[k]);
        } else {
          c[k] = b[k];
        }
      }

      return function(t) {
        for (k in i) c[k] = i[k](t);
        return c;
      };
    }

    var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
        reB = new RegExp(reA.source, "g");

    function zero(b) {
      return function() {
        return b;
      };
    }

    function one(b) {
      return function(t) {
        return b(t) + "";
      };
    }

    function interpolateString(a, b) {
      var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
          am, // current match in a
          bm, // current match in b
          bs, // string preceding current number in b, if any
          i = -1, // index in s
          s = [], // string constants and placeholders
          q = []; // number interpolators

      // Coerce inputs to strings.
      a = a + "", b = b + "";

      // Interpolate pairs of numbers in a & b.
      while ((am = reA.exec(a))
          && (bm = reB.exec(b))) {
        if ((bs = bm.index) > bi) { // a string precedes the next number in b
          bs = b.slice(bi, bs);
          if (s[i]) s[i] += bs; // coalesce with previous string
          else s[++i] = bs;
        }
        if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
          if (s[i]) s[i] += bm; // coalesce with previous string
          else s[++i] = bm;
        } else { // interpolate non-matching numbers
          s[++i] = null;
          q.push({i: i, x: interpolateNumber(am, bm)});
        }
        bi = reB.lastIndex;
      }

      // Add remains of b.
      if (bi < b.length) {
        bs = b.slice(bi);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }

      // Special optimization for only a single match.
      // Otherwise, interpolate each of the numbers and rejoin the string.
      return s.length < 2 ? (q[0]
          ? one(q[0].x)
          : zero(b))
          : (b = q.length, function(t) {
              for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
              return s.join("");
            });
    }

    function interpolate(a, b) {
      var t = typeof b, c;
      return b == null || t === "boolean" ? constant$1(b)
          : (t === "number" ? interpolateNumber
          : t === "string" ? ((c = color(b)) ? (b = c, interpolateRgb) : interpolateString)
          : b instanceof color ? interpolateRgb
          : b instanceof Date ? date
          : isNumberArray(b) ? numberArray
          : Array.isArray(b) ? genericArray
          : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
          : interpolateNumber)(a, b);
    }

    function interpolateRound(a, b) {
      return a = +a, b = +b, function(t) {
        return Math.round(a * (1 - t) + b * t);
      };
    }

    const pi = Math.PI,
        tau = 2 * pi,
        epsilon = 1e-6,
        tauEpsilon = tau - epsilon;

    function Path() {
      this._x0 = this._y0 = // start of current subpath
      this._x1 = this._y1 = null; // end of current subpath
      this._ = "";
    }

    function path() {
      return new Path;
    }

    Path.prototype = path.prototype = {
      constructor: Path,
      moveTo: function(x, y) {
        this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
      },
      closePath: function() {
        if (this._x1 !== null) {
          this._x1 = this._x0, this._y1 = this._y0;
          this._ += "Z";
        }
      },
      lineTo: function(x, y) {
        this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      quadraticCurveTo: function(x1, y1, x, y) {
        this._ += "Q" + (+x1) + "," + (+y1) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      bezierCurveTo: function(x1, y1, x2, y2, x, y) {
        this._ += "C" + (+x1) + "," + (+y1) + "," + (+x2) + "," + (+y2) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      arcTo: function(x1, y1, x2, y2, r) {
        x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
        var x0 = this._x1,
            y0 = this._y1,
            x21 = x2 - x1,
            y21 = y2 - y1,
            x01 = x0 - x1,
            y01 = y0 - y1,
            l01_2 = x01 * x01 + y01 * y01;

        // Is the radius negative? Error.
        if (r < 0) throw new Error("negative radius: " + r);

        // Is this path empty? Move to (x1,y1).
        if (this._x1 === null) {
          this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
        }

        // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
        else if (!(l01_2 > epsilon));

        // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
        // Equivalently, is (x1,y1) coincident with (x2,y2)?
        // Or, is the radius zero? Line to (x1,y1).
        else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
          this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
        }

        // Otherwise, draw an arc!
        else {
          var x20 = x2 - x0,
              y20 = y2 - y0,
              l21_2 = x21 * x21 + y21 * y21,
              l20_2 = x20 * x20 + y20 * y20,
              l21 = Math.sqrt(l21_2),
              l01 = Math.sqrt(l01_2),
              l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
              t01 = l / l01,
              t21 = l / l21;

          // If the start tangent is not coincident with (x0,y0), line to.
          if (Math.abs(t01 - 1) > epsilon) {
            this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
          }

          this._ += "A" + r + "," + r + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
        }
      },
      arc: function(x, y, r, a0, a1, ccw) {
        x = +x, y = +y, r = +r, ccw = !!ccw;
        var dx = r * Math.cos(a0),
            dy = r * Math.sin(a0),
            x0 = x + dx,
            y0 = y + dy,
            cw = 1 ^ ccw,
            da = ccw ? a0 - a1 : a1 - a0;

        // Is the radius negative? Error.
        if (r < 0) throw new Error("negative radius: " + r);

        // Is this path empty? Move to (x0,y0).
        if (this._x1 === null) {
          this._ += "M" + x0 + "," + y0;
        }

        // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
        else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
          this._ += "L" + x0 + "," + y0;
        }

        // Is this arc empty? We’re done.
        if (!r) return;

        // Does the angle go the wrong way? Flip the direction.
        if (da < 0) da = da % tau + tau;

        // Is this a complete circle? Draw two arcs to complete the circle.
        if (da > tauEpsilon) {
          this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
        }

        // Is this arc non-empty? Draw an arc!
        else if (da > epsilon) {
          this._ += "A" + r + "," + r + ",0," + (+(da >= pi)) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
        }
      },
      rect: function(x, y, w, h) {
        this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + (+w) + "v" + (+h) + "h" + (-w) + "Z";
      },
      toString: function() {
        return this._;
      }
    };

    function formatDecimal(x) {
      return Math.abs(x = Math.round(x)) >= 1e21
          ? x.toLocaleString("en").replace(/,/g, "")
          : x.toString(10);
    }

    // Computes the decimal coefficient and exponent of the specified number x with
    // significant digits p, where x is positive and p is in [1, 21] or undefined.
    // For example, formatDecimalParts(1.23) returns ["123", 0].
    function formatDecimalParts(x, p) {
      if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
      var i, coefficient = x.slice(0, i);

      // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
      // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
      return [
        coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
        +x.slice(i + 1)
      ];
    }

    function exponent(x) {
      return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
    }

    function formatGroup(grouping, thousands) {
      return function(value, width) {
        var i = value.length,
            t = [],
            j = 0,
            g = grouping[0],
            length = 0;

        while (i > 0 && g > 0) {
          if (length + g + 1 > width) g = Math.max(1, width - length);
          t.push(value.substring(i -= g, i + g));
          if ((length += g + 1) > width) break;
          g = grouping[j = (j + 1) % grouping.length];
        }

        return t.reverse().join(thousands);
      };
    }

    function formatNumerals(numerals) {
      return function(value) {
        return value.replace(/[0-9]/g, function(i) {
          return numerals[+i];
        });
      };
    }

    // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
    var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

    function formatSpecifier(specifier) {
      if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
      var match;
      return new FormatSpecifier({
        fill: match[1],
        align: match[2],
        sign: match[3],
        symbol: match[4],
        zero: match[5],
        width: match[6],
        comma: match[7],
        precision: match[8] && match[8].slice(1),
        trim: match[9],
        type: match[10]
      });
    }

    formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

    function FormatSpecifier(specifier) {
      this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
      this.align = specifier.align === undefined ? ">" : specifier.align + "";
      this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
      this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
      this.zero = !!specifier.zero;
      this.width = specifier.width === undefined ? undefined : +specifier.width;
      this.comma = !!specifier.comma;
      this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
      this.trim = !!specifier.trim;
      this.type = specifier.type === undefined ? "" : specifier.type + "";
    }

    FormatSpecifier.prototype.toString = function() {
      return this.fill
          + this.align
          + this.sign
          + this.symbol
          + (this.zero ? "0" : "")
          + (this.width === undefined ? "" : Math.max(1, this.width | 0))
          + (this.comma ? "," : "")
          + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
          + (this.trim ? "~" : "")
          + this.type;
    };

    // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
    function formatTrim(s) {
      out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
        switch (s[i]) {
          case ".": i0 = i1 = i; break;
          case "0": if (i0 === 0) i0 = i; i1 = i; break;
          default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
        }
      }
      return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
    }

    var prefixExponent;

    function formatPrefixAuto(x, p) {
      var d = formatDecimalParts(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1],
          i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
          n = coefficient.length;
      return i === n ? coefficient
          : i > n ? coefficient + new Array(i - n + 1).join("0")
          : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
          : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0]; // less than 1y!
    }

    function formatRounded(x, p) {
      var d = formatDecimalParts(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1];
      return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
          : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
          : coefficient + new Array(exponent - coefficient.length + 2).join("0");
    }

    var formatTypes = {
      "%": (x, p) => (x * 100).toFixed(p),
      "b": (x) => Math.round(x).toString(2),
      "c": (x) => x + "",
      "d": formatDecimal,
      "e": (x, p) => x.toExponential(p),
      "f": (x, p) => x.toFixed(p),
      "g": (x, p) => x.toPrecision(p),
      "o": (x) => Math.round(x).toString(8),
      "p": (x, p) => formatRounded(x * 100, p),
      "r": formatRounded,
      "s": formatPrefixAuto,
      "X": (x) => Math.round(x).toString(16).toUpperCase(),
      "x": (x) => Math.round(x).toString(16)
    };

    function identity$1(x) {
      return x;
    }

    var map = Array.prototype.map,
        prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

    function formatLocale(locale) {
      var group = locale.grouping === undefined || locale.thousands === undefined ? identity$1 : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
          currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
          currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
          decimal = locale.decimal === undefined ? "." : locale.decimal + "",
          numerals = locale.numerals === undefined ? identity$1 : formatNumerals(map.call(locale.numerals, String)),
          percent = locale.percent === undefined ? "%" : locale.percent + "",
          minus = locale.minus === undefined ? "−" : locale.minus + "",
          nan = locale.nan === undefined ? "NaN" : locale.nan + "";

      function newFormat(specifier) {
        specifier = formatSpecifier(specifier);

        var fill = specifier.fill,
            align = specifier.align,
            sign = specifier.sign,
            symbol = specifier.symbol,
            zero = specifier.zero,
            width = specifier.width,
            comma = specifier.comma,
            precision = specifier.precision,
            trim = specifier.trim,
            type = specifier.type;

        // The "n" type is an alias for ",g".
        if (type === "n") comma = true, type = "g";

        // The "" type, and any invalid type, is an alias for ".12~g".
        else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

        // If zero fill is specified, padding goes after sign and before digits.
        if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

        // Compute the prefix and suffix.
        // For SI-prefix, the suffix is lazily computed.
        var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
            suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

        // What format function should we use?
        // Is this an integer type?
        // Can this type generate exponential notation?
        var formatType = formatTypes[type],
            maybeSuffix = /[defgprs%]/.test(type);

        // Set the default precision if not specified,
        // or clamp the specified precision to the supported range.
        // For significant precision, it must be in [1, 21].
        // For fixed precision, it must be in [0, 20].
        precision = precision === undefined ? 6
            : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
            : Math.max(0, Math.min(20, precision));

        function format(value) {
          var valuePrefix = prefix,
              valueSuffix = suffix,
              i, n, c;

          if (type === "c") {
            valueSuffix = formatType(value) + valueSuffix;
            value = "";
          } else {
            value = +value;

            // Determine the sign. -0 is not less than 0, but 1 / -0 is!
            var valueNegative = value < 0 || 1 / value < 0;

            // Perform the initial formatting.
            value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

            // Trim insignificant zeros.
            if (trim) value = formatTrim(value);

            // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
            if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

            // Compute the prefix and suffix.
            valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
            valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

            // Break the formatted value into the integer “value” part that can be
            // grouped, and fractional or exponential “suffix” part that is not.
            if (maybeSuffix) {
              i = -1, n = value.length;
              while (++i < n) {
                if (c = value.charCodeAt(i), 48 > c || c > 57) {
                  valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                  value = value.slice(0, i);
                  break;
                }
              }
            }
          }

          // If the fill character is not "0", grouping is applied before padding.
          if (comma && !zero) value = group(value, Infinity);

          // Compute the padding.
          var length = valuePrefix.length + value.length + valueSuffix.length,
              padding = length < width ? new Array(width - length + 1).join(fill) : "";

          // If the fill character is "0", grouping is applied after padding.
          if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

          // Reconstruct the final output based on the desired alignment.
          switch (align) {
            case "<": value = valuePrefix + value + valueSuffix + padding; break;
            case "=": value = valuePrefix + padding + value + valueSuffix; break;
            case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
            default: value = padding + valuePrefix + value + valueSuffix; break;
          }

          return numerals(value);
        }

        format.toString = function() {
          return specifier + "";
        };

        return format;
      }

      function formatPrefix(specifier, value) {
        var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
            e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
            k = Math.pow(10, -e),
            prefix = prefixes[8 + e / 3];
        return function(value) {
          return f(k * value) + prefix;
        };
      }

      return {
        format: newFormat,
        formatPrefix: formatPrefix
      };
    }

    var locale;
    var format;
    var formatPrefix;

    defaultLocale({
      thousands: ",",
      grouping: [3],
      currency: ["$", ""]
    });

    function defaultLocale(definition) {
      locale = formatLocale(definition);
      format = locale.format;
      formatPrefix = locale.formatPrefix;
      return locale;
    }

    function precisionFixed(step) {
      return Math.max(0, -exponent(Math.abs(step)));
    }

    function precisionPrefix(step, value) {
      return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
    }

    function precisionRound(step, max) {
      step = Math.abs(step), max = Math.abs(max) - step;
      return Math.max(0, exponent(max) - exponent(step)) + 1;
    }

    function initRange(domain, range) {
      switch (arguments.length) {
        case 0: break;
        case 1: this.range(domain); break;
        default: this.range(range).domain(domain); break;
      }
      return this;
    }

    function constants(x) {
      return function() {
        return x;
      };
    }

    function number(x) {
      return +x;
    }

    var unit = [0, 1];

    function identity(x) {
      return x;
    }

    function normalize(a, b) {
      return (b -= (a = +a))
          ? function(x) { return (x - a) / b; }
          : constants(isNaN(b) ? NaN : 0.5);
    }

    function clamper(a, b) {
      var t;
      if (a > b) t = a, a = b, b = t;
      return function(x) { return Math.max(a, Math.min(b, x)); };
    }

    // normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
    // interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
    function bimap(domain, range, interpolate) {
      var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
      if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
      else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
      return function(x) { return r0(d0(x)); };
    }

    function polymap(domain, range, interpolate) {
      var j = Math.min(domain.length, range.length) - 1,
          d = new Array(j),
          r = new Array(j),
          i = -1;

      // Reverse descending domains.
      if (domain[j] < domain[0]) {
        domain = domain.slice().reverse();
        range = range.slice().reverse();
      }

      while (++i < j) {
        d[i] = normalize(domain[i], domain[i + 1]);
        r[i] = interpolate(range[i], range[i + 1]);
      }

      return function(x) {
        var i = bisectRight(domain, x, 1, j) - 1;
        return r[i](d[i](x));
      };
    }

    function copy(source, target) {
      return target
          .domain(source.domain())
          .range(source.range())
          .interpolate(source.interpolate())
          .clamp(source.clamp())
          .unknown(source.unknown());
    }

    function transformer() {
      var domain = unit,
          range = unit,
          interpolate$1 = interpolate,
          transform,
          untransform,
          unknown,
          clamp = identity,
          piecewise,
          output,
          input;

      function rescale() {
        var n = Math.min(domain.length, range.length);
        if (clamp !== identity) clamp = clamper(domain[0], domain[n - 1]);
        piecewise = n > 2 ? polymap : bimap;
        output = input = null;
        return scale;
      }

      function scale(x) {
        return x == null || isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate$1)))(transform(clamp(x)));
      }

      scale.invert = function(y) {
        return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
      };

      scale.domain = function(_) {
        return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
      };

      scale.range = function(_) {
        return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
      };

      scale.rangeRound = function(_) {
        return range = Array.from(_), interpolate$1 = interpolateRound, rescale();
      };

      scale.clamp = function(_) {
        return arguments.length ? (clamp = _ ? true : identity, rescale()) : clamp !== identity;
      };

      scale.interpolate = function(_) {
        return arguments.length ? (interpolate$1 = _, rescale()) : interpolate$1;
      };

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      return function(t, u) {
        transform = t, untransform = u;
        return rescale();
      };
    }

    function continuous() {
      return transformer()(identity, identity);
    }

    function tickFormat(start, stop, count, specifier) {
      var step = tickStep(start, stop, count),
          precision;
      specifier = formatSpecifier(specifier == null ? ",f" : specifier);
      switch (specifier.type) {
        case "s": {
          var value = Math.max(Math.abs(start), Math.abs(stop));
          if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
          return formatPrefix(specifier, value);
        }
        case "":
        case "e":
        case "g":
        case "p":
        case "r": {
          if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
          break;
        }
        case "f":
        case "%": {
          if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
          break;
        }
      }
      return format(specifier);
    }

    function linearish(scale) {
      var domain = scale.domain;

      scale.ticks = function(count) {
        var d = domain();
        return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
      };

      scale.tickFormat = function(count, specifier) {
        var d = domain();
        return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
      };

      scale.nice = function(count) {
        if (count == null) count = 10;

        var d = domain();
        var i0 = 0;
        var i1 = d.length - 1;
        var start = d[i0];
        var stop = d[i1];
        var prestep;
        var step;
        var maxIter = 10;

        if (stop < start) {
          step = start, start = stop, stop = step;
          step = i0, i0 = i1, i1 = step;
        }
        
        while (maxIter-- > 0) {
          step = tickIncrement(start, stop, count);
          if (step === prestep) {
            d[i0] = start;
            d[i1] = stop;
            return domain(d);
          } else if (step > 0) {
            start = Math.floor(start / step) * step;
            stop = Math.ceil(stop / step) * step;
          } else if (step < 0) {
            start = Math.ceil(start * step) / step;
            stop = Math.floor(stop * step) / step;
          } else {
            break;
          }
          prestep = step;
        }

        return scale;
      };

      return scale;
    }

    function linear() {
      var scale = continuous();

      scale.copy = function() {
        return copy(scale, linear());
      };

      initRange.apply(scale, arguments);

      return linearish(scale);
    }

    function constant(x) {
      return function constant() {
        return x;
      };
    }

    function array(x) {
      return typeof x === "object" && "length" in x
        ? x // Array, TypedArray, NodeList, array-like
        : Array.from(x); // Map, Set, iterable, string, or anything else
    }

    function Linear(context) {
      this._context = context;
    }

    Linear.prototype = {
      areaStart: function() {
        this._line = 0;
      },
      areaEnd: function() {
        this._line = NaN;
      },
      lineStart: function() {
        this._point = 0;
      },
      lineEnd: function() {
        if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
        this._line = 1 - this._line;
      },
      point: function(x, y) {
        x = +x, y = +y;
        switch (this._point) {
          case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
          case 1: this._point = 2; // falls through
          default: this._context.lineTo(x, y); break;
        }
      }
    };

    function curveLinear(context) {
      return new Linear(context);
    }

    function x(p) {
      return p[0];
    }

    function y(p) {
      return p[1];
    }

    function line(x$1, y$1) {
      var defined = constant(true),
          context = null,
          curve = curveLinear,
          output = null;

      x$1 = typeof x$1 === "function" ? x$1 : (x$1 === undefined) ? x : constant(x$1);
      y$1 = typeof y$1 === "function" ? y$1 : (y$1 === undefined) ? y : constant(y$1);

      function line(data) {
        var i,
            n = (data = array(data)).length,
            d,
            defined0 = false,
            buffer;

        if (context == null) output = curve(buffer = path());

        for (i = 0; i <= n; ++i) {
          if (!(i < n && defined(d = data[i], i, data)) === defined0) {
            if (defined0 = !defined0) output.lineStart();
            else output.lineEnd();
          }
          if (defined0) output.point(+x$1(d, i, data), +y$1(d, i, data));
        }

        if (buffer) return output = null, buffer + "" || null;
      }

      line.x = function(_) {
        return arguments.length ? (x$1 = typeof _ === "function" ? _ : constant(+_), line) : x$1;
      };

      line.y = function(_) {
        return arguments.length ? (y$1 = typeof _ === "function" ? _ : constant(+_), line) : y$1;
      };

      line.defined = function(_) {
        return arguments.length ? (defined = typeof _ === "function" ? _ : constant(!!_), line) : defined;
      };

      line.curve = function(_) {
        return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
      };

      line.context = function(_) {
        return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
      };

      return line;
    }

    const STEP = 0.0125;
    // const STEP = 0.5;
    const CUT_SIZE = 1;
    const ALPHA_RANGE = 5;

    class Plot {
      constructor(context, n) {
        this.touch = 0;
        this.ctx = context; 
        this.height = this.ctx.height;
        this.width = this.ctx.width;
        this.unitToAlpha = linear().domain([0, 1]).range([-ALPHA_RANGE, ALPHA_RANGE]);
        this.n = n;
        this.kernels = [null, null];
        this.kernels[0] = new RBFKernel();
        this.kernels[1] = new RBFShuffleKernel(CUT_SIZE);
        this.active_ker = 0;
        this.K = Matrix.zeros(this.n, this.n);
        this.invK = Matrix.zeros(this.n, this.n);
        this.validInv = true;
        this.curveCache = null; // cc[ci][xi] = y.  (curve_idx, x_idx)
        this.xCache = null;

        this.populate();

      }


      initK() {
        var n = this.n, v;
        this.K = Matrix.zeros(this.n, this.n);
        for (let i = 0; i != n; i++) {
          for (let j = 0; j != n; j++) {
            v = this.kernel(this.x[i], this.x[j]);
            this.K.set(i,j,v);
          }
        }
        this.initInvK();
      }

      initInvK() {
        try {
          var inv = inverse(this.K); 
          this.invK = inv;
          this.validInv = true;
        } catch(err) {
          console.log('could not invert K.  leaving as-is');
          this.validInv = false;
        }
      }

      // updates i'th row/column of K
      updateK(i) {
        var v;
        for (let k = 0; k != this.n; k++) {
          v = this.kernel(this.x[i], this.x[k]);
          this.K.set(k,i,v);
          this.K.set(i,k,v);
        }
      }

      initXCache() {
        var cuts = [this.ctx.xmin, this.ctx.xmax];
        var xs;
        for (let i = 0; i != this.n; i++)
          cuts.push(...this.jumps(this.x[i]));
        cuts.sort((a, b) => a - b);

        this.xCache = new Array(0);
        for (let s = 0; s != cuts.length - 1; s++) {
          xs = range(cuts[s], cuts[s+1], STEP);
          this.xCache.push(xs);
        }
      }

      initCurveCache() {
        var n = this.n;
        this.initXCache();
        this.curveCache = new Array(n);
        for (let ci = 0; ci != n; ci++) 
            this.updateCurveCache(ci);
      }

      // updates i'th curve Cache
      updateCurveCache(ci) {
        var seg;
        this.curveCache[ci] = new Array();
        for (let si = 0; si != this.xCache.length; si++) {
          seg = this.xCache[si].map(x => this.kernel(this.x[ci], x));
          this.curveCache[ci].push(...seg);
        }
      }

      toggle_scramble() {
        this.active_ker = 1 - this.active_ker;
        this.initK();
        this.initCurveCache();
      }

      scrambled() {
        return this.active_ker == 1;
      }

      resetAlpha() {
        this.alpha.fill(1);
      }

      set_sigma(log_sigma) {
        for (let k = 0; k != this.kernels.length; k++) {
          this.kernels[k].set_sigma(Math.pow(10, log_sigma));
        }
        for (let ci = 0; ci != this.n; ci++)
          this.updateCurveCache(ci);

        this.initK();
      }

      get_sigma2() {
        return this.kernels[this.active_ker].get_sigma2();
      }

      populate() {
        var n = this.n;
        this.x = new Array(n);
        this.y = new Array(n);
        this.alpha = new Array(n); 

        for (let i = 0; i != n; i++) {
          this.x[i] = this.ctx.unitToX(Math.random());
          this.alpha[i] = this.unitToAlpha(Math.random());
        }
        this.initK();
        this.initCurveCache();

        for (let i = 0; i != n; i++) 
          this.y[i] = this.solutionPoint(i);

        this.alpha.fill(1.0);
      }

      setDataPoint(i, u, v) {
        // update the value of the i'th data point
        this.x[i] = this.ctx.x(u);
        this.y[i] = this.ctx.y(v);
        this.initK();
        this.initInvK();
        this.updateCurveCache(i);
      }

      kernel(x1, x2) {
        return this.kernels[this.active_ker].call(x1, x2);
      }

      kernelInv0(y) {
        return this.kernels[this.active_ker].inv0(y);
      }

      jumps(x) {
        var k = this.kernels[this.active_ker];
        return k.cuts(x, this.ctx.xmin, this.ctx.xmax);
      }


      solutionAlpha() {
        var y = new Matrix([this.y]);
        var alpha = y.mmul(this.invK).flat();
        return alpha;

      }

      functionNorm() {
        var a = new Matrix([this.alpha]);
        var norm = a.mmul(this.K).mmul(a.transpose()).flat()[0];
        // console.log(norm);
        return norm;
      }

      resize(w, h) {
        this.ctx.setWidth(w);
        this.ctx.setHeight(h);
        this.width = this.ctx.width;
        this.height = this.ctx.height;
      }

      updateContext(context) {
        this.ctx = context;
        this.height = this.ctx.height;
        this.width = this.ctx.width;
      }

      addPoint() {
        this.n++;
        this.populate();
      }

      delPoint() {
        if (this.n == 0) return;
        this.n--;
        this.populate();
      }

      updateAlpha(delta, index) {
        this.alpha[index] += delta;
      }

      makeLine(xs, ys) {
        const path = line()
          .x(d => this.ctx.u(d[0]))
          .y(d => this.ctx.v(d[1]))(zip(xs,ys));
        return path || '';
      }

      makeLines(ys) {
        var line = '';
        var off = 0, rng, len;
        for (let si = 0; si != this.xCache.length; si++) {
          rng = this.xCache[si];
          len = rng.length;
          line += this.makeLine(rng, ys.slice(off, off + len));
          off += len;
        }
        return line;
      }

      curve(ci) {
        var ys;
        var a = this.alpha[ci];
        var ys = this.curveCache[ci].map(y => a * y);
        return this.makeLines(ys);
      }

      solutionCurve() {
        if (this.n == 0) return '';
        var ys = new Array(this.curveCache[0].length).fill(0.0);

        for (let ci = 0; ci != this.n; ci++) {
          var a = this.alpha[ci];
          var cc = this.curveCache[ci];
          for (let xi = 0; xi != cc.length; xi++)
            ys[xi] += cc[xi] * a;
        }
        return this.makeLines(ys);
      }
      
      // return the u,v points for the i'th scaled curve
      points(i) {
        var a = this.alpha[i];
        var pts = range(this.n).map(j => [
          this.ctx.u(this.x[j]), 
          this.ctx.v(a * this.K.get(i,j))
        ]);
        return pts;
      }

      data() {
        return zip(this.x, this.y).map(([x,y]) => 
          [this.ctx.u(x), this.ctx.v(y)]
        );
      }


      // return the y value for the solution at the i'th x location
      // unused currently
      solutionPoint(i) {
        var y = range(this.n).map(j => this.alpha[j] * this.K.get(i,j))
          .reduce((y1, y2) => y1 + y2, 0);
        return y;
      }


      u(x) {
        return this.ctx.u(x);
      }

      v(y) {
        return this.ctx.v(y);
      }


    }

    class Context {
      constructor(width, height, [xmin, xmax], [ymin, ymax]) {
        this.width = width;
        this.height = height;
        this.xmin = xmin;
        this.xmax = xmax;
        this.ymin = ymin;
        this.ymax = ymax;
        this.xToViewport = linear().domain([xmin, xmax]).range([0,width]);
        this.yToViewport = linear().domain([ymin, ymax]).range([height,0]);
        this.unitToX = linear().domain([0, 1]).range([xmin, xmax]);
        this.unitToY = linear().domain([0, 1]).range([ymin, ymax]);
        this.xToUnit = linear().domain([xmin, xmax]).range([0, 1]);
        // console.log(d3.scaleLinear);
      }

      setWidth(w) {
        this.width = w;
        this.xToViewport.range([0,w]);
      }

      setHeight(h) {
        this.height = h;
        this.yToViewport.range([h,0]);
      }

      x(u) {
        return this.xToViewport.invert(u);
      }

      y(v) {
        return this.yToViewport.invert(v);
      }

      u(x) {
        return this.xToViewport(x);
      }

      v(y) {
        return this.yToViewport(y);
      }

      xDomain() {
        return this.xToViewport.domain();
      }

      yDomain() {
        return this.yToViewport.domain();
      }
    }

    function make_sync(updater, sig) {
    	var flag = false;

      /* Synopsis: 
       * import { writable } from 'svelte/store';
       * let sig = writable(0);
       * 
       * $: respond($sig);
       * $: notify(obj);
       *
       */
    	var respond = (val) => {
    			updater();
    			flag = true;
    	};

    	var notify = (val) => {
    		 if (flag) {
    			 flag = false;
    			 return;
    		 } 
    		 sig.update(n => n + 1);
    	};
    	return [respond, notify];
    }

    /* src/Curves.svelte generated by Svelte v3.38.2 */

    const { console: console_1 } = globals;
    const file$4 = "src/Curves.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i][0];
    	child_ctx[15] = list[i][1];
    	child_ctx[17] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i][0];
    	child_ctx[15] = list[i][1];
    	return child_ctx;
    }

    // (99:9) {#if cfg.show_scaled}
    function create_if_block_3(ctx) {
    	let path;
    	let path_d_value;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "class", "curve svelte-1rtr9hj");
    			attr_dev(path, "d", path_d_value = /*plot*/ ctx[1].curve(/*i*/ ctx[17]));
    			add_location(path, file$4, 99, 11, 1557);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*plot*/ 2 && path_d_value !== (path_d_value = /*plot*/ ctx[1].curve(/*i*/ ctx[17]))) {
    				attr_dev(path, "d", path_d_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(99:9) {#if cfg.show_scaled}",
    		ctx
    	});

    	return block;
    }

    // (103:9) {#if cfg.show_points}
    function create_if_block_2(ctx) {
    	let each_1_anchor;
    	let each_value_2 = /*plot*/ ctx[1].points(/*i*/ ctx[17]);
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*plot, range*/ 2) {
    				each_value_2 = /*plot*/ ctx[1].points(/*i*/ ctx[17]);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(103:9) {#if cfg.show_points}",
    		ctx
    	});

    	return block;
    }

    // (104:11) {#each plot.points(i) as [u,v]}
    function create_each_block_2(ctx) {
    	let circle;
    	let circle_cx_value;
    	let circle_cy_value;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			attr_dev(circle, "class", "point svelte-1rtr9hj");
    			attr_dev(circle, "cx", circle_cx_value = /*u*/ ctx[14]);
    			attr_dev(circle, "cy", circle_cy_value = /*v*/ ctx[15]);
    			attr_dev(circle, "r", "4");
    			add_location(circle, file$4, 104, 13, 1702);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*plot*/ 2 && circle_cx_value !== (circle_cx_value = /*u*/ ctx[14])) {
    				attr_dev(circle, "cx", circle_cx_value);
    			}

    			if (dirty & /*plot*/ 2 && circle_cy_value !== (circle_cy_value = /*v*/ ctx[15])) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(104:11) {#each plot.points(i) as [u,v]}",
    		ctx
    	});

    	return block;
    }

    // (98:7) {#each range(plot.n) as i}
    function create_each_block_1(ctx) {
    	let if_block0_anchor;
    	let if_block1_anchor;
    	let if_block0 = /*cfg*/ ctx[3].show_scaled && create_if_block_3(ctx);
    	let if_block1 = /*cfg*/ ctx[3].show_points && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			if_block0_anchor = empty();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, if_block0_anchor, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*cfg*/ ctx[3].show_scaled) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(if_block0_anchor.parentNode, if_block0_anchor);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*cfg*/ ctx[3].show_points) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(if_block0_anchor);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(98:7) {#each range(plot.n) as i}",
    		ctx
    	});

    	return block;
    }

    // (110:7) {#if cfg.show_solution}
    function create_if_block_1(ctx) {
    	let path;
    	let path_d_value;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "class", "solution-curve svelte-1rtr9hj");
    			attr_dev(path, "d", path_d_value = /*plot*/ ctx[1].solutionCurve());
    			add_location(path, file$4, 110, 9, 1840);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*plot*/ 2 && path_d_value !== (path_d_value = /*plot*/ ctx[1].solutionCurve())) {
    				attr_dev(path, "d", path_d_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(110:7) {#if cfg.show_solution}",
    		ctx
    	});

    	return block;
    }

    // (114:7) {#if cfg.show_data}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*plot*/ ctx[1].data();
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*plot, onMouseDown*/ 18) {
    				each_value = /*plot*/ ctx[1].data();
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(114:7) {#if cfg.show_data}",
    		ctx
    	});

    	return block;
    }

    // (115:9) {#each plot.data() as [u,v], i}
    function create_each_block$1(ctx) {
    	let circle;
    	let circle_cx_value;
    	let circle_cy_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			attr_dev(circle, "id", /*i*/ ctx[17]);
    			attr_dev(circle, "class", "data svelte-1rtr9hj");
    			attr_dev(circle, "cx", circle_cx_value = /*u*/ ctx[14]);
    			attr_dev(circle, "cy", circle_cy_value = /*v*/ ctx[15]);
    			attr_dev(circle, "r", "5");
    			add_location(circle, file$4, 115, 11, 1991);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);

    			if (!mounted) {
    				dispose = listen_dev(circle, "mousedown", /*onMouseDown*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*plot*/ 2 && circle_cx_value !== (circle_cx_value = /*u*/ ctx[14])) {
    				attr_dev(circle, "cx", circle_cx_value);
    			}

    			if (dirty & /*plot*/ 2 && circle_cy_value !== (circle_cy_value = /*v*/ ctx[15])) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(115:9) {#each plot.data() as [u,v], i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div;
    	let svg;
    	let each_1_anchor;
    	let if_block0_anchor;
    	let div_resize_listener;
    	let mounted;
    	let dispose;
    	let each_value_1 = range(/*plot*/ ctx[1].n);
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let if_block0 = /*cfg*/ ctx[3].show_solution && create_if_block_1(ctx);
    	let if_block1 = /*cfg*/ ctx[3].show_data && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			if (if_block0) if_block0.c();
    			if_block0_anchor = empty();
    			if (if_block1) if_block1.c();
    			attr_dev(svg, "class", "inner-plot full svelte-1rtr9hj");
    			add_location(svg, file$4, 92, 2, 1378);
    			attr_dev(div, "class", "svg-wrap svelte-1rtr9hj");
    			add_render_callback(() => /*div_elementresize_handler*/ ctx[8].call(div));
    			add_location(div, file$4, 90, 0, 1297);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			append_dev(svg, each_1_anchor);
    			if (if_block0) if_block0.m(svg, null);
    			append_dev(svg, if_block0_anchor);
    			if (if_block1) if_block1.m(svg, null);
    			div_resize_listener = add_resize_listener(div, /*div_elementresize_handler*/ ctx[8].bind(div));

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "mousemove", /*onMouseMove*/ ctx[5], false, false, false),
    					listen_dev(svg, "mouseup", /*onMouseUp*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*plot, range, cfg*/ 10) {
    				each_value_1 = range(/*plot*/ ctx[1].n);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (/*cfg*/ ctx[3].show_solution) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(svg, if_block0_anchor);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*cfg*/ ctx[3].show_data) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(svg, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			div_resize_listener();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $sig,
    		$$unsubscribe_sig = noop,
    		$$subscribe_sig = () => ($$unsubscribe_sig(), $$unsubscribe_sig = subscribe(sig, $$value => $$invalidate(7, $sig = $$value)), sig);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_sig());
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Curves", slots, []);
    	let { sig } = $$props, { box } = $$props, { cfg } = $$props, { plot } = $$props;
    	validate_store(sig, "sig");
    	$$subscribe_sig();
    	let drag_point = null;

    	function update() {
    		$$invalidate(1, plot.touch++, plot);
    	}

    	var [respond, notify] = make_sync(update, sig);

    	function resize(width, height) {
    		console.log(`in resize with ${width} x ${height}`);
    		plot.resize(width, height);
    		update();
    	}

    	onMount(() => {
    		resize(box.w, box.h);
    	});

    	function onMouseDown(evt) {
    		drag_point = evt.target;
    	}

    	function onMouseMove(evt) {
    		if (drag_point == null) return;
    		plot.setDataPoint(drag_point.id, evt.offsetX, evt.offsetY);
    		if (cfg.auto_solve) $$invalidate(1, plot.alpha = plot.solutionAlpha(), plot);
    		update();
    	}

    	function onMouseUp(evt) {
    		drag_point = null;
    	}

    	const writable_props = ["sig", "box", "cfg", "plot"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Curves> was created with unknown prop '${key}'`);
    	});

    	function div_elementresize_handler() {
    		box.w = this.clientWidth;
    		box.h = this.clientHeight;
    		$$invalidate(0, box);
    	}

    	$$self.$$set = $$props => {
    		if ("sig" in $$props) $$subscribe_sig($$invalidate(2, sig = $$props.sig));
    		if ("box" in $$props) $$invalidate(0, box = $$props.box);
    		if ("cfg" in $$props) $$invalidate(3, cfg = $$props.cfg);
    		if ("plot" in $$props) $$invalidate(1, plot = $$props.plot);
    	};

    	$$self.$capture_state = () => ({
    		make_sync,
    		range,
    		onMount,
    		sig,
    		box,
    		cfg,
    		plot,
    		drag_point,
    		update,
    		respond,
    		notify,
    		resize,
    		onMouseDown,
    		onMouseMove,
    		onMouseUp,
    		$sig
    	});

    	$$self.$inject_state = $$props => {
    		if ("sig" in $$props) $$subscribe_sig($$invalidate(2, sig = $$props.sig));
    		if ("box" in $$props) $$invalidate(0, box = $$props.box);
    		if ("cfg" in $$props) $$invalidate(3, cfg = $$props.cfg);
    		if ("plot" in $$props) $$invalidate(1, plot = $$props.plot);
    		if ("drag_point" in $$props) drag_point = $$props.drag_point;
    		if ("respond" in $$props) $$invalidate(11, respond = $$props.respond);
    		if ("notify" in $$props) $$invalidate(12, notify = $$props.notify);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*box*/ 1) {
    			resize(box.w, box.h);
    		}

    		if ($$self.$$.dirty & /*$sig*/ 128) {
    			respond($sig);
    		}

    		if ($$self.$$.dirty & /*plot*/ 2) {
    			notify(plot);
    		}
    	};

    	return [
    		box,
    		plot,
    		sig,
    		cfg,
    		onMouseDown,
    		onMouseMove,
    		onMouseUp,
    		$sig,
    		div_elementresize_handler
    	];
    }

    class Curves extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { sig: 2, box: 0, cfg: 3, plot: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Curves",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*sig*/ ctx[2] === undefined && !("sig" in props)) {
    			console_1.warn("<Curves> was created without expected prop 'sig'");
    		}

    		if (/*box*/ ctx[0] === undefined && !("box" in props)) {
    			console_1.warn("<Curves> was created without expected prop 'box'");
    		}

    		if (/*cfg*/ ctx[3] === undefined && !("cfg" in props)) {
    			console_1.warn("<Curves> was created without expected prop 'cfg'");
    		}

    		if (/*plot*/ ctx[1] === undefined && !("plot" in props)) {
    			console_1.warn("<Curves> was created without expected prop 'plot'");
    		}
    	}

    	get sig() {
    		throw new Error("<Curves>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sig(value) {
    		throw new Error("<Curves>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get box() {
    		throw new Error("<Curves>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set box(value) {
    		throw new Error("<Curves>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get cfg() {
    		throw new Error("<Curves>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cfg(value) {
    		throw new Error("<Curves>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get plot() {
    		throw new Error("<Curves>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set plot(value) {
    		throw new Error("<Curves>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function numberDisplay(n) {
      var ns = Math.abs(n) > 1000 ? n.toExponential(2) : n.toFixed(2);
      return ns;
    }

    /* src/LowPanelControls.svelte generated by Svelte v3.38.2 */
    const file$3 = "src/LowPanelControls.svelte";

    function create_fragment$3(ctx) {
    	let div12;
    	let div3;
    	let div0;
    	let button0;
    	let t1;
    	let div1;
    	let label0;
    	let t2;
    	let input0;
    	let t3_value = Math.pow(10, /*cfg*/ ctx[0].log_sigma).toFixed(3) + "";
    	let t3;
    	let t4;
    	let div2;
    	let d_math;
    	let t6;

    	let t7_value = (/*plot*/ ctx[1].validInv
    	? numberDisplay(/*plot*/ ctx[1].functionNorm())
    	: "Error: non-singular K") + "";

    	let t7;
    	let t8;
    	let div6;
    	let div4;
    	let button1;
    	let t10;
    	let div5;
    	let button2;
    	let t11_value = (/*plot*/ ctx[1].scrambled() ? "Unscramble" : "Scramble") + "";
    	let t11;
    	let t12;
    	let div11;
    	let div7;
    	let label1;
    	let input1;
    	let t13;
    	let t14;
    	let div8;
    	let label2;
    	let input2;
    	let t15;
    	let t16;
    	let div9;
    	let label3;
    	let input3;
    	let t17;
    	let t18;
    	let div10;
    	let label4;
    	let input4;
    	let t19;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div12 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "New Data";
    			t1 = space();
    			div1 = element("div");
    			label0 = element("label");
    			t2 = text("Sigma: ");
    			input0 = element("input");
    			t3 = text(t3_value);
    			t4 = space();
    			div2 = element("div");
    			d_math = element("d-math");
    			d_math.textContent = "\\|f\\| =";
    			t6 = space();
    			t7 = text(t7_value);
    			t8 = space();
    			div6 = element("div");
    			div4 = element("div");
    			button1 = element("button");
    			button1.textContent = "Solve";
    			t10 = space();
    			div5 = element("div");
    			button2 = element("button");
    			t11 = text(t11_value);
    			t12 = space();
    			div11 = element("div");
    			div7 = element("div");
    			label1 = element("label");
    			input1 = element("input");
    			t13 = text("points");
    			t14 = space();
    			div8 = element("div");
    			label2 = element("label");
    			input2 = element("input");
    			t15 = text("curves");
    			t16 = space();
    			div9 = element("div");
    			label3 = element("label");
    			input3 = element("input");
    			t17 = text("solution");
    			t18 = space();
    			div10 = element("div");
    			label4 = element("label");
    			input4 = element("input");
    			t19 = text("auto solve");
    			add_location(button0, file$3, 73, 27, 1275);
    			attr_dev(div0, "class", "pad-small svelte-165jjul");
    			add_location(div0, file$3, 73, 4, 1252);
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "-5");
    			attr_dev(input0, "max", "2");
    			attr_dev(input0, "step", "0.1");
    			add_location(input0, file$3, 75, 20, 1406);
    			add_location(label0, file$3, 75, 6, 1392);
    			attr_dev(div1, "class", "pad-small svelte-165jjul");
    			add_location(div1, file$3, 74, 4, 1362);
    			add_location(d_math, file$3, 78, 6, 1569);
    			attr_dev(div2, "class", "pad-small svelte-165jjul");
    			add_location(div2, file$3, 77, 4, 1539);
    			set_style(div3, "flex-grow", "1");
    			add_location(div3, file$3, 72, 2, 1221);
    			add_location(button1, file$3, 83, 27, 1757);
    			attr_dev(div4, "class", "pad-small svelte-165jjul");
    			add_location(div4, file$3, 83, 4, 1734);
    			add_location(button2, file$3, 84, 27, 1843);
    			attr_dev(div5, "class", "pad-small svelte-165jjul");
    			add_location(div5, file$3, 84, 4, 1820);
    			set_style(div6, "flex-grow", "1");
    			add_location(div6, file$3, 82, 2, 1703);
    			attr_dev(input1, "type", "checkbox");
    			add_location(input1, file$3, 90, 16, 2043);
    			add_location(label1, file$3, 90, 9, 2036);
    			add_location(div7, file$3, 90, 4, 2031);
    			attr_dev(input2, "type", "checkbox");
    			add_location(input2, file$3, 91, 16, 2136);
    			add_location(label2, file$3, 91, 9, 2129);
    			add_location(div8, file$3, 91, 4, 2124);
    			attr_dev(input3, "type", "checkbox");
    			add_location(input3, file$3, 92, 16, 2229);
    			add_location(label3, file$3, 92, 9, 2222);
    			add_location(div9, file$3, 92, 4, 2217);
    			attr_dev(input4, "type", "checkbox");
    			add_location(input4, file$3, 93, 16, 2326);
    			add_location(label4, file$3, 93, 9, 2319);
    			add_location(div10, file$3, 93, 4, 2314);
    			set_style(div11, "flex-grow", "1: align: right");
    			add_location(div11, file$3, 89, 2, 1985);
    			attr_dev(div12, "class", "row control pad svelte-165jjul");
    			add_location(div12, file$3, 71, 0, 1189);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div3);
    			append_dev(div3, div0);
    			append_dev(div0, button0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			append_dev(div1, label0);
    			append_dev(label0, t2);
    			append_dev(label0, input0);
    			set_input_value(input0, /*cfg*/ ctx[0].log_sigma);
    			append_dev(label0, t3);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			append_dev(div2, d_math);
    			append_dev(div2, t6);
    			append_dev(div2, t7);
    			append_dev(div12, t8);
    			append_dev(div12, div6);
    			append_dev(div6, div4);
    			append_dev(div4, button1);
    			append_dev(div6, t10);
    			append_dev(div6, div5);
    			append_dev(div5, button2);
    			append_dev(button2, t11);
    			append_dev(div12, t12);
    			append_dev(div12, div11);
    			append_dev(div11, div7);
    			append_dev(div7, label1);
    			append_dev(label1, input1);
    			input1.checked = /*cfg*/ ctx[0].show_points;
    			append_dev(label1, t13);
    			append_dev(div11, t14);
    			append_dev(div11, div8);
    			append_dev(div8, label2);
    			append_dev(label2, input2);
    			input2.checked = /*cfg*/ ctx[0].show_scaled;
    			append_dev(label2, t15);
    			append_dev(div11, t16);
    			append_dev(div11, div9);
    			append_dev(div9, label3);
    			append_dev(label3, input3);
    			input3.checked = /*cfg*/ ctx[0].show_solution;
    			append_dev(label3, t17);
    			append_dev(div11, t18);
    			append_dev(div11, div10);
    			append_dev(div10, label4);
    			append_dev(label4, input4);
    			input4.checked = /*cfg*/ ctx[0].auto_solve;
    			append_dev(label4, t19);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[6], false, false, false),
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[7]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[7]),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[8], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[9], false, false, false),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[10]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[11]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[12]),
    					listen_dev(input4, "change", /*input4_change_handler*/ ctx[13])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*cfg*/ 1) {
    				set_input_value(input0, /*cfg*/ ctx[0].log_sigma);
    			}

    			if (dirty & /*cfg*/ 1 && t3_value !== (t3_value = Math.pow(10, /*cfg*/ ctx[0].log_sigma).toFixed(3) + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*plot*/ 2 && t7_value !== (t7_value = (/*plot*/ ctx[1].validInv
    			? numberDisplay(/*plot*/ ctx[1].functionNorm())
    			: "Error: non-singular K") + "")) set_data_dev(t7, t7_value);

    			if (dirty & /*plot*/ 2 && t11_value !== (t11_value = (/*plot*/ ctx[1].scrambled() ? "Unscramble" : "Scramble") + "")) set_data_dev(t11, t11_value);

    			if (dirty & /*cfg*/ 1) {
    				input1.checked = /*cfg*/ ctx[0].show_points;
    			}

    			if (dirty & /*cfg*/ 1) {
    				input2.checked = /*cfg*/ ctx[0].show_scaled;
    			}

    			if (dirty & /*cfg*/ 1) {
    				input3.checked = /*cfg*/ ctx[0].show_solution;
    			}

    			if (dirty & /*cfg*/ 1) {
    				input4.checked = /*cfg*/ ctx[0].auto_solve;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div12);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $sig,
    		$$unsubscribe_sig = noop,
    		$$subscribe_sig = () => ($$unsubscribe_sig(), $$unsubscribe_sig = subscribe(sig, $$value => $$invalidate(5, $sig = $$value)), sig);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_sig());
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("LowPanelControls", slots, []);
    	let { sig } = $$props, { cfg } = $$props, { plot } = $$props;
    	validate_store(sig, "sig");
    	$$subscribe_sig();

    	function update() {
    		$$invalidate(1, plot.touch++, plot);
    	}

    	var [respond, notify] = make_sync(update, sig);

    	function toggle_scramble() {
    		plot.toggle_scramble();
    		if (cfg.auto_solve) solve();
    		$$invalidate(1, plot.touch++, plot);
    	}

    	function set_sigma(log_sigma) {
    		plot.set_sigma(log_sigma);
    		if (cfg.auto_solve) $$invalidate(1, plot.alpha = plot.solutionAlpha(), plot);
    		$$invalidate(1, plot.touch++, plot);
    	}

    	function solve() {
    		var start_alpha = plot.alpha;
    		var end_alpha = plot.solutionAlpha();

    		function transition(step, nsteps) {
    			var delta = step / nsteps;

    			for (let i = 0; i != plot.n; i++) {
    				$$invalidate(1, plot.alpha[i] = delta * end_alpha[i] + (1 - delta) * start_alpha[i], plot);
    			}

    			if (step != nsteps) {
    				setTimeout(() => transition(step + 1, nsteps), 10);
    			}
    		}

    		transition(0, 100);
    	}

    	const writable_props = ["sig", "cfg", "plot"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<LowPanelControls> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		plot.populate();
    		$$invalidate(1, plot.touch++, plot);
    	};

    	function input0_change_input_handler() {
    		cfg.log_sigma = to_number(this.value);
    		$$invalidate(0, cfg);
    	}

    	const click_handler_1 = () => {
    		solve();
    	};

    	const click_handler_2 = () => {
    		toggle_scramble();
    	};

    	function input1_change_handler() {
    		cfg.show_points = this.checked;
    		$$invalidate(0, cfg);
    	}

    	function input2_change_handler() {
    		cfg.show_scaled = this.checked;
    		$$invalidate(0, cfg);
    	}

    	function input3_change_handler() {
    		cfg.show_solution = this.checked;
    		$$invalidate(0, cfg);
    	}

    	function input4_change_handler() {
    		cfg.auto_solve = this.checked;
    		$$invalidate(0, cfg);
    	}

    	$$self.$$set = $$props => {
    		if ("sig" in $$props) $$subscribe_sig($$invalidate(2, sig = $$props.sig));
    		if ("cfg" in $$props) $$invalidate(0, cfg = $$props.cfg);
    		if ("plot" in $$props) $$invalidate(1, plot = $$props.plot);
    	};

    	$$self.$capture_state = () => ({
    		make_sync,
    		numberDisplay,
    		sig,
    		cfg,
    		plot,
    		update,
    		respond,
    		notify,
    		toggle_scramble,
    		set_sigma,
    		solve,
    		$sig
    	});

    	$$self.$inject_state = $$props => {
    		if ("sig" in $$props) $$subscribe_sig($$invalidate(2, sig = $$props.sig));
    		if ("cfg" in $$props) $$invalidate(0, cfg = $$props.cfg);
    		if ("plot" in $$props) $$invalidate(1, plot = $$props.plot);
    		if ("respond" in $$props) $$invalidate(15, respond = $$props.respond);
    		if ("notify" in $$props) $$invalidate(16, notify = $$props.notify);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*cfg*/ 1) {
    			set_sigma(cfg.log_sigma);
    		}

    		if ($$self.$$.dirty & /*$sig*/ 32) {
    			respond($sig);
    		}

    		if ($$self.$$.dirty & /*plot*/ 2) {
    			notify(plot);
    		}
    	};

    	return [
    		cfg,
    		plot,
    		sig,
    		toggle_scramble,
    		solve,
    		$sig,
    		click_handler,
    		input0_change_input_handler,
    		click_handler_1,
    		click_handler_2,
    		input1_change_handler,
    		input2_change_handler,
    		input3_change_handler,
    		input4_change_handler
    	];
    }

    class LowPanelControls extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { sig: 2, cfg: 0, plot: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LowPanelControls",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*sig*/ ctx[2] === undefined && !("sig" in props)) {
    			console.warn("<LowPanelControls> was created without expected prop 'sig'");
    		}

    		if (/*cfg*/ ctx[0] === undefined && !("cfg" in props)) {
    			console.warn("<LowPanelControls> was created without expected prop 'cfg'");
    		}

    		if (/*plot*/ ctx[1] === undefined && !("plot" in props)) {
    			console.warn("<LowPanelControls> was created without expected prop 'plot'");
    		}
    	}

    	get sig() {
    		throw new Error("<LowPanelControls>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sig(value) {
    		throw new Error("<LowPanelControls>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get cfg() {
    		throw new Error("<LowPanelControls>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cfg(value) {
    		throw new Error("<LowPanelControls>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get plot() {
    		throw new Error("<LowPanelControls>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set plot(value) {
    		throw new Error("<LowPanelControls>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/SliderControls.svelte generated by Svelte v3.38.2 */
    const file$2 = "src/SliderControls.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	child_ctx[11] = list;
    	child_ctx[12] = i;
    	return child_ctx;
    }

    // (52:2) {#each plot.alpha as a, i}
    function create_each_block(ctx) {
    	let div;
    	let input;
    	let t0;
    	let code;
    	let t1_value = numberDisplay(/*a*/ ctx[10]) + "";
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	function input_change_input_handler() {
    		/*input_change_input_handler*/ ctx[6].call(input, /*each_value*/ ctx[11], /*i*/ ctx[12]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			code = element("code");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(input, "type", "range");
    			attr_dev(input, "min", "-10");
    			attr_dev(input, "max", "10");
    			attr_dev(input, "step", "0.01");
    			add_location(input, file$2, 53, 6, 972);
    			attr_dev(code, "class", "alphas svelte-eznsce");
    			add_location(code, file$2, 54, 6, 1037);
    			attr_dev(div, "class", "row pad-small svelte-eznsce");
    			add_location(div, file$2, 52, 4, 938);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			set_input_value(input, /*a*/ ctx[10]);
    			append_dev(div, t0);
    			append_dev(div, code);
    			append_dev(code, t1);
    			append_dev(div, t2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", input_change_input_handler),
    					listen_dev(input, "input", input_change_input_handler)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*plot*/ 1) {
    				set_input_value(input, /*a*/ ctx[10]);
    			}

    			if (dirty & /*plot*/ 1 && t1_value !== (t1_value = numberDisplay(/*a*/ ctx[10]) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(52:2) {#each plot.alpha as a, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div4;
    	let div0;
    	let button0;
    	let t1;
    	let div3;
    	let div1;
    	let button1;
    	let t3;
    	let div2;
    	let button2;
    	let t5;
    	let mounted;
    	let dispose;
    	let each_value = /*plot*/ ctx[0].alpha;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Reset Alpha";
    			t1 = space();
    			div3 = element("div");
    			div1 = element("div");
    			button1 = element("button");
    			button1.textContent = "Del Point";
    			t3 = space();
    			div2 = element("div");
    			button2 = element("button");
    			button2.textContent = "Add Point";
    			t5 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(button0, file$2, 45, 4, 562);
    			attr_dev(div0, "class", "pad-small svelte-eznsce");
    			add_location(div0, file$2, 44, 2, 534);
    			add_location(button1, file$2, 48, 27, 701);
    			attr_dev(div1, "class", "pad-small svelte-eznsce");
    			add_location(div1, file$2, 48, 4, 678);
    			add_location(button2, file$2, 49, 27, 812);
    			attr_dev(div2, "class", "pad-small svelte-eznsce");
    			add_location(div2, file$2, 49, 4, 789);
    			attr_dev(div3, "class", "row svelte-eznsce");
    			add_location(div3, file$2, 47, 2, 656);
    			attr_dev(div4, "class", "pad col svelte-eznsce");
    			add_location(div4, file$2, 43, 0, 510);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, button0);
    			append_dev(div4, t1);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, button1);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, button2);
    			append_dev(div4, t5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[3], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[4], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*numberDisplay, plot*/ 1) {
    				each_value = /*plot*/ ctx[0].alpha;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div4, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $sig,
    		$$unsubscribe_sig = noop,
    		$$subscribe_sig = () => ($$unsubscribe_sig(), $$unsubscribe_sig = subscribe(sig, $$value => $$invalidate(2, $sig = $$value)), sig);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_sig());
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SliderControls", slots, []);
    	let { sig } = $$props, { plot } = $$props;
    	validate_store(sig, "sig");
    	$$subscribe_sig();

    	function update() {
    		$$invalidate(0, plot.touch++, plot);
    	}

    	var [respond, notify] = make_sync(update, sig);
    	const writable_props = ["sig", "plot"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SliderControls> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		plot.resetAlpha();
    		$$invalidate(0, plot.touch++, plot);
    	};

    	const click_handler_1 = () => {
    		plot.delPoint();
    		$$invalidate(0, plot.touch++, plot);
    	};

    	const click_handler_2 = () => {
    		plot.addPoint();
    		$$invalidate(0, plot.touch++, plot);
    	};

    	function input_change_input_handler(each_value, i) {
    		each_value[i] = to_number(this.value);
    		$$invalidate(0, plot);
    	}

    	$$self.$$set = $$props => {
    		if ("sig" in $$props) $$subscribe_sig($$invalidate(1, sig = $$props.sig));
    		if ("plot" in $$props) $$invalidate(0, plot = $$props.plot);
    	};

    	$$self.$capture_state = () => ({
    		make_sync,
    		numberDisplay,
    		sig,
    		plot,
    		update,
    		respond,
    		notify,
    		$sig
    	});

    	$$self.$inject_state = $$props => {
    		if ("sig" in $$props) $$subscribe_sig($$invalidate(1, sig = $$props.sig));
    		if ("plot" in $$props) $$invalidate(0, plot = $$props.plot);
    		if ("respond" in $$props) $$invalidate(8, respond = $$props.respond);
    		if ("notify" in $$props) $$invalidate(9, notify = $$props.notify);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$sig*/ 4) {
    			respond($sig);
    		}

    		if ($$self.$$.dirty & /*plot*/ 1) {
    			notify(plot);
    		}
    	};

    	return [
    		plot,
    		sig,
    		$sig,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		input_change_input_handler
    	];
    }

    class SliderControls extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { sig: 1, plot: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SliderControls",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*sig*/ ctx[1] === undefined && !("sig" in props)) {
    			console.warn("<SliderControls> was created without expected prop 'sig'");
    		}

    		if (/*plot*/ ctx[0] === undefined && !("plot" in props)) {
    			console.warn("<SliderControls> was created without expected prop 'plot'");
    		}
    	}

    	get sig() {
    		throw new Error("<SliderControls>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sig(value) {
    		throw new Error("<SliderControls>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get plot() {
    		throw new Error("<SliderControls>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set plot(value) {
    		throw new Error("<SliderControls>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Figure1.svelte generated by Svelte v3.38.2 */
    const file$1 = "src/Figure1.svelte";

    function create_fragment$1(ctx) {
    	let div1;
    	let div0;
    	let curves;
    	let t0;
    	let lowpanelcontrols;
    	let t1;
    	let slidercontrols;
    	let current;

    	curves = new Curves({
    			props: {
    				sig: /*sig*/ ctx[3],
    				box: /*box*/ ctx[0],
    				cfg: /*cfg*/ ctx[1],
    				plot: /*plot*/ ctx[2]
    			},
    			$$inline: true
    		});

    	lowpanelcontrols = new LowPanelControls({
    			props: {
    				sig: /*sig*/ ctx[3],
    				cfg: /*cfg*/ ctx[1],
    				plot: /*plot*/ ctx[2]
    			},
    			$$inline: true
    		});

    	slidercontrols = new SliderControls({
    			props: {
    				sig: /*sig*/ ctx[3],
    				plot: /*plot*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			create_component(curves.$$.fragment);
    			t0 = space();
    			create_component(lowpanelcontrols.$$.fragment);
    			t1 = space();
    			create_component(slidercontrols.$$.fragment);
    			attr_dev(div0, "class", "col full svelte-59d2b5");
    			add_location(div0, file$1, 45, 2, 803);
    			attr_dev(div1, "class", "row full svelte-59d2b5");
    			add_location(div1, file$1, 44, 0, 778);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(curves, div0, null);
    			append_dev(div0, t0);
    			mount_component(lowpanelcontrols, div0, null);
    			append_dev(div1, t1);
    			mount_component(slidercontrols, div1, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(curves.$$.fragment, local);
    			transition_in(lowpanelcontrols.$$.fragment, local);
    			transition_in(slidercontrols.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(curves.$$.fragment, local);
    			transition_out(lowpanelcontrols.$$.fragment, local);
    			transition_out(slidercontrols.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(curves);
    			destroy_component(lowpanelcontrols);
    			destroy_component(slidercontrols);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Figure1", slots, []);
    	let box = { w: 10, h: 10 };

    	let cfg = {
    		show_data: true,
    		show_scaled: true,
    		show_solution: true,
    		show_points: false,
    		auto_solve: true,
    		log_sigma: 0
    	};

    	let ctx = new Context(box.w, box.h, [-4, 4], [-4, 4]);
    	let plot = new Plot(ctx, 3);
    	let sig = writable(0);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Figure1> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		writable,
    		Plot,
    		Context,
    		Curves,
    		LowPanelControls,
    		SliderControls,
    		box,
    		cfg,
    		ctx,
    		plot,
    		sig
    	});

    	$$self.$inject_state = $$props => {
    		if ("box" in $$props) $$invalidate(0, box = $$props.box);
    		if ("cfg" in $$props) $$invalidate(1, cfg = $$props.cfg);
    		if ("ctx" in $$props) ctx = $$props.ctx;
    		if ("plot" in $$props) $$invalidate(2, plot = $$props.plot);
    		if ("sig" in $$props) $$invalidate(3, sig = $$props.sig);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [box, cfg, plot, sig];
    }

    class Figure1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Figure1",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/FullPagePlot.svelte generated by Svelte v3.38.2 */
    const file = "src/FullPagePlot.svelte";

    function create_fragment(ctx) {
    	let div;
    	let figure1;
    	let current;
    	figure1 = new Figure1({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(figure1.$$.fragment);
    			attr_dev(div, "class", "view svelte-11vt6n");
    			add_location(div, file, 15, 0, 149);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(figure1, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(figure1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(figure1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(figure1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FullPagePlot", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FullPagePlot> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Figure1 });
    	return [];
    }

    class FullPagePlot extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FullPagePlot",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const full_page = new FullPagePlot({
    	target: document.body
    });

    return full_page;

}());
//# sourceMappingURL=full_plot_bundle.js.map
