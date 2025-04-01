
declare module 'just-handlebars-helpers' {
  const H: {
    registerHelpers: (handlebars: typeof import('handlebars')) => void;
  };
  export default H;
} 