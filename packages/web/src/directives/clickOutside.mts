import type { Directive } from 'vue';

interface ClickOutsideElement extends HTMLElement {
  _clickOutside?: {
    handler: (event: MouseEvent) => void;
    middleware: (event: MouseEvent) => boolean;
  };
}

const directive: Directive = {
  mounted(el: ClickOutsideElement, binding) {
    const onClick = (event: MouseEvent) => {
      // If the event came from an element inside the target or the target itself, don't do anything
      if (el === event.target || el.contains(event.target as Node)) {
        return;
      }
      
      // If we have a middleware function and it returns false, don't do anything
      if (el._clickOutside?.middleware && !el._clickOutside.middleware(event)) {
        return;
      }
      
      // Call the provided function
      binding.value(event);
    };
    
    // Store the handler function
    el._clickOutside = {
      handler: onClick,
      middleware: typeof binding.arg === 'function' ? binding.arg : (() => true),
    };
    
    // Add the event listener
    setTimeout(() => {
      document.addEventListener('click', el._clickOutside!.handler);
    }, 0);
  },
  
  beforeUnmount(el: ClickOutsideElement) {
    // Remove the event listener
    if (el._clickOutside) {
      document.removeEventListener('click', el._clickOutside.handler);
      delete el._clickOutside;
    }
  },
};

export default directive; 