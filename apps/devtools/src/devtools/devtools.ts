chrome.devtools.panels.create(
  'Animations',
  '',
  'src/panel/panel.html',
  (panel) => {
    // Panel created
    console.log('Animation DevTools panel created');
  },
);
