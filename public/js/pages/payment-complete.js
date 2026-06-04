const { createApp, ref, onMounted, onUnmounted } = Vue;

createApp({
  setup() {
    const el = document.getElementById('app');
    const orderId = el.dataset.orderId;

    const state = ref('loading');   // 'loading' | 'success' | 'pending'
    const message = ref('付款尚未完成，請至訂單頁確認狀態。');
    const countdown = ref(3);

    let timer = null;

    function startCountdown() {
      timer = setInterval(() => {
        countdown.value -= 1;
        if (countdown.value <= 0) {
          clearInterval(timer);
          window.location.href = '/orders/' + orderId;
        }
      }, 1000);
    }

    onMounted(async function () {
      if (!orderId) {
        state.value = 'pending';
        message.value = '找不到訂單資訊，請手動查看訂單列表。';
        return;
      }

      try {
        const res = await apiFetch('/api/ecpay/status/' + orderId);
        if (res.data && res.data.paid) {
          state.value = 'success';
          startCountdown();
        } else {
          state.value = 'pending';
          message.value = res.message || '付款尚未完成，請至訂單頁確認狀態。';
        }
      } catch (e) {
        state.value = 'pending';
        const msg = e?.data?.message || '查詢付款狀態失敗，請手動確認訂單。';
        message.value = msg;
      }
    });

    onUnmounted(function () {
      if (timer) clearInterval(timer);
    });

    return { orderId, state, message, countdown };
  }
}).mount('#app');
