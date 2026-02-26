(function() {
    'use strict';
    
    let defaultListId = null;
    
    async function getDefaultList() {
        if (defaultListId) return defaultListId;
        try {
            const res = await fetch('/api/task-lists', { credentials: 'include' });
            if (!res.ok) return null;
            const data = await res.json();
            const lists = data.lists || data || [];
            const inbox = lists.find(l => l.name && l.name.toLowerCase() === 'inbox');
            defaultListId = inbox ? inbox.id : (lists[0]?.id || null);
            return defaultListId;
        } catch (e) {
            return null;
        }
    }
    
    async function captureTask(title) {
        const listId = await getDefaultList();
        
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                title: title,
                due_date: today,
                my_day: true,
                list_id: listId || undefined
            })
        });
        
        if (!res.ok) throw new Error('Failed to create task');
        return await res.json();
    }
    
    function initQuickCapture() {
        const input = document.getElementById('quick-capture-input');
        const btn = document.getElementById('quick-capture-btn');
        if (!input || !btn) return;
        
        async function handleCapture() {
            const text = input.value.trim();
            if (!text) return;
            
            btn.disabled = true;
            input.disabled = true;
            
            try {
                await captureTask(text);
                input.value = '';
                input.classList.add('capture-success');
                setTimeout(() => input.classList.remove('capture-success'), 1000);
                if (window.MyDayWidget) window.MyDayWidget.refresh();
            } catch (err) {
                input.classList.add('capture-error');
                setTimeout(() => input.classList.remove('capture-error'), 1000);
                console.error('Quick capture error:', err);
            } finally {
                btn.disabled = false;
                input.disabled = false;
                input.focus();
            }
        }
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleCapture();
        });
        
        btn.addEventListener('click', handleCapture);
        
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                input.focus();
            }
        });
    }
    
    document.addEventListener('DOMContentLoaded', initQuickCapture);
})();
