module.exports = {
  plugins: [
    require('tailwindcss'),
    require('postcss-easings'),
    require('autoprefixer'),
    require('cssnano')({
      preset: 'default',
    }),
  ],
}
