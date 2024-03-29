import * as d3 from 'd3';

export class Context {
  constructor(width, height, [xmin, xmax], [ymin, ymax]) {
    this.width = width;
    this.height = height;
    this.xmin = xmin;
    this.xmax = xmax;
    this.ymin = ymin;
    this.ymax = ymax;
    this.xToViewport = d3.scaleLinear().domain([xmin, xmax]).range([0,width]);
    this.yToViewport = d3.scaleLinear().domain([ymin, ymax]).range([height,0]);
    this.unitToX = d3.scaleLinear().domain([0, 1]).range([xmin, xmax]);
    this.unitToY = d3.scaleLinear().domain([0, 1]).range([ymin, ymax]);
    this.xToUnit = d3.scaleLinear().domain([xmin, xmax]).range([0, 1]);
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

