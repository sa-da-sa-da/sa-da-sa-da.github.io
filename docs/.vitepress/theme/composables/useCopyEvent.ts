// 搭配modal.scss使用
export function useCopyEvent(): void {
  document.addEventListener("copy", () => {
    showSlideBanner();
  });

  function showSlideBanner(): void {
    const banner = document.createElement("div");
    banner.className = "slide-banner";
    banner.innerHTML = `
      <div class="slide-content">
        <!-- 这里是复制后，提示的文本内容-->
        <h1>✨️你拷贝了哦！~被我发现呢，一定要标注本文来源哦！</h1>
      </div>
      <div class="slide-block"></div>
    `;

    document.body.appendChild(banner);

    // 出现动画~
    setTimeout(() => {
      banner.classList.add("show");
    }, 10);

    setTimeout(() => {
      const slideBlock = banner.querySelector('.slide-block') as HTMLElement;
      slideBlock.style.width = '100%';
    }, 10);

    setTimeout(() => {
      banner.classList.add("hide");
    }, 2500);
  }
}
