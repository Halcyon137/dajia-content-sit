function addPlan(user) {
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:grid;place-items:center;z-index:20;padding:20px';
  backdrop.innerHTML = `<div style="width:min(420px,100%);background:#fff;color:#202124;border-radius:16px;padding:24px;box-shadow:0 20px 60px #0004">
    <h2 style="margin:0 0 8px;font:500 24px Georgia,serif">为 ${user} 添加套餐</h2>
    <p style="color:#78807b;font-size:13px;margin:0 0 16px">配置完成后，该用户即可查看受限内容。</p>
    <select id="admin-plan-select" style="width:100%;padding:12px;border:1px solid #e5e1d9;border-radius:9px;font-size:14px">
      <option value="新人体验 · 7天">新人体验 · 7天</option>
      <option value="月套餐 · 30天">月套餐 · 30天</option>
      <option value="季度套餐 · 90天">季度套餐 · 90天</option>
      <option value="年套餐 · 365天">年套餐 · 365天</option>
    </select>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">
      <button id="admin-cancel" class="btn">取消</button>
      <button id="admin-confirm" class="btn primary">确认添加</button>
    </div>
  </div>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector('#admin-cancel').onclick = () => backdrop.remove();
  backdrop.querySelector('#admin-confirm').onclick = () => {
    const plan = backdrop.querySelector('#admin-plan-select').value;
    localStorage.setItem('memberPlan', plan);
    backdrop.remove();
    alert(`已为 ${user} 添加 ${plan}，该用户现在可以查看内容（原型演示）`);
  };
}
