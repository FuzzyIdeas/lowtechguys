module.exports = {
  plugins: [
    require('tailwindcss'),
    require('postcss-easings'),
    require('postcss-easing-gradients'),
    require('autoprefixer'),
    require('cssnano')({
      preset: 'default',
    }),
  ],
}
