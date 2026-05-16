export function clearAntOverlays() {
  document.querySelectorAll('.ant-modal-mask').forEach((el) => el.remove());
  document.querySelectorAll('.ant-modal-wrap').forEach((el) => {
    if (!el.querySelector('.ant-modal')) el.remove();
  });
  document.body.style.overflow = '';
}
