// Only the GitHub Pages export uses a repository base path. Native and local web stay unchanged.
module.exports = ({ config }) => ({
  ...config,
  ...(process.env.WAFFER_PAGES_BUILD === '1'
    ? { experiments: { ...config.experiments, baseUrl: '/waffer' } }
    : {}),
});
