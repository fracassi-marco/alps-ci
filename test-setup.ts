import { Window } from 'happy-dom';

// Setup happy-dom for DOM testing
const window = new Window({
  url: 'http://localhost:3000',
  width: 1024,
  height: 768,
});

global.window = window as any;
global.document = window.document as any;
global.navigator = window.navigator as any;
global.HTMLElement = window.HTMLElement as any;
global.Element = window.Element as any;

