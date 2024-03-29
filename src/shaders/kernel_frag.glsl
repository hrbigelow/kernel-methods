precision mediump float;
precision lowp int;
uniform vec2 u_resolution;
uniform float u_sigma;
uniform float cut_size;
uniform bool u_do_scramble;
uniform float u_xmin;
uniform float u_xmax;

const vec3 blue = vec3(0.0,0.0,1.0);
const vec3 white = vec3(1.0,1.0,1.0);
const float pi = 3.1415926539;

float slope = u_xmax - u_xmin;
float intercept = u_xmin;


float scramble(float x) {
    float d = floor(x / cut_size);
    float r = x - d * cut_size;
    if (abs(mod(d, 2.0)) == 1.0) {
        x = x + cut_size - 2.0 * r;
    }
    return x;
}

float kernel(vec2 st) {
  float fac = 1.0 / (u_sigma * sqrt(2.0 * pi));
  return fac * exp(-0.5 * pow((st.x - st.y) / u_sigma, 2.0));
}

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution;
  st = vec2(st.x, 1.0 - st.y) * slope + intercept;
  if (u_do_scramble) {
    st = vec2(scramble(st.x), st.y);
  }
  
  float k = kernel(st) / kernel(vec2(0.0,0.0));
  vec3 color = k * blue + (1.0 - k) * white;
  gl_FragColor = vec4(color,1.0);
}

