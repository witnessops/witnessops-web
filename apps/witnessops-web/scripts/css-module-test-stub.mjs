const styles = new Proxy(
  {},
  {
    get(_target, property) {
      return String(property);
    },
  },
);

export default styles;
