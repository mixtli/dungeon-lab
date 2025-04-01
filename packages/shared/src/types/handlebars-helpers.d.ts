declare module 'handlebars-helpers' {
  function helpers(options?: { handlebars?: any }): any;
  export = helpers;
}

declare module 'just-handlebars-helpers' {
  const H: {
    registerHelpers: (handlebars: typeof import('handlebars')) => void;
  };
  export default H;
} 