/** Comandos de câmera (aproximar, afastar, redefinir) enviados pela interface. */
const bus = new EventTarget();
export const sendViewCommand = (name) => bus.dispatchEvent(new CustomEvent("view", { detail: name }));
export const onViewCommand = (fn) => {
  const h = (e) => fn(e.detail);
  bus.addEventListener("view", h);
  return () => bus.removeEventListener("view", h);
};
