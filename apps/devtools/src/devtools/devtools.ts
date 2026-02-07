chrome.devtools.panels.create(
  'Animations',
  '',
  'src/panel/panel.html',
  (_panel) => {
    // Panel created — will be used for show/hide hooks later
    console.log('Animation DevTools panel created');
  },
);
