/**
 * APP-LOGIC.JS - HỆ THỐNG QUẢN LÝ PICKLEBALL (PMS PRO)
 * PHIÊN BẢN TỔNG HỢP ĐẦY ĐỦ: Cấu hình, Loại sân, Timeline, POS, Sân
 */

// 1. Khởi tạo bộ nhớ tạm
window.dataCache = window.dataCache || { 
    stocks: {}, bills: {}, members: {}, courts: {}, 
    bookings: {}, services: {}, config: {}, staff: {}, 
    systemConfig: {}, courtTypes: {} 
};
window.selectedCourtId = window.selectedCourtId || null;
window.app = window.app || {};
window.app.posCart = window.app.posCart || [];
window.posCart = []; // Lưu trữ món hàng đang chọn bán lẻ

// 2. Khởi tạo giao diện khi tải trang
const initAppUI = () => {
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = ['view-date', 'filter-bill-from', 'filter-bill-to', 'report-date-from', 'report-date-to', 'b-date'];
    dateInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });
    if (window.app.renderHoursHeader) window.app.renderHoursHeader();
};
window.addEventListener('DOMContentLoaded', initAppUI);

// 3. ĐỐI TƯỢNG NGHIỆP VỤ CHÍNH
window.app = {
    ...window.app,

    // --- PHẦN 1: QUẢN LÝ LOẠI SÂN & GIÁ CẢ (MỚI BỔ SUNG) ---

    // Thêm loại sân mới
    addCourtType: async () => {
        const nameEl = document.getElementById('new-type-name');
        const name = nameEl ? nameEl.value.trim() : '';
        if (!name) return alert("Vui lòng nhập tên loại sân!");
        try {
            const id = 'type_' + Date.now();
            await window.set(window.ref(window.db, 'settings/courtTypes/' + id), name);
            nameEl.value = '';
            console.log("Đã thêm loại sân:", name);
        } catch (e) { alert("Lỗi: " + e.message); }
    },

    // Xóa loại sân
    deleteCourtType: async (id) => {
        if (confirm("Xóa loại sân này? Toàn bộ cấu hình giá liên quan sẽ bị ảnh hưởng.")) {
            await window.remove(window.ref(window.db, 'settings/courtTypes/' + id));
        }
    },

    // Vẽ danh sách loại sân vào Modal Quản lý và ô Select khi thêm sân
    renderCourtTypes: () => {
        const types = window.dataCache.courtTypes || {};
        const listContainer = document.getElementById('court-type-list');
        const selectContainer = document.getElementById('c-type');
        
        let htmlList = '';
        let htmlSelect = '<option value="">-- Chọn loại sân --</option>';

        Object.entries(types).forEach(([id, name]) => {
            htmlList += `
                <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl mb-2 border border-slate-100">
                    <span class="font-bold text-sm text-slate-700">${name}</span>
                    <button onclick="app.deleteCourtType('${id}')" class="text-rose-500 p-2"><i class="fa-solid fa-trash-can"></i></button>
                </div>`;
            htmlSelect += `<option value="${name}">${name}</option>`;
        });

        if (listContainer) listContainer.innerHTML = htmlList || '<p class="text-xs text-slate-400 italic text-center">Chưa có loại sân nào</p>';
        if (selectContainer) selectContainer.innerHTML = htmlSelect;
        
        // Sau khi vẽ loại sân, vẽ luôn bảng giá tương ứng
        app.renderPriceConfig();
    },

    // Vẽ bảng cấu hình giá theo từng loại sân (Tab Cấu hình)
    renderPriceConfig: () => {
        const types = window.dataCache.courtTypes || {};
        const savedPrices = window.dataCache.config?.priceList || {}; 
        let html = '';
        
        Object.values(types).forEach(typeName => {
            const currentPrice = savedPrices[typeName] || 0;
            html += `
                <div class="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span class="text-[10px] font-black text-slate-500 uppercase">${typeName}</span>
                    <div class="flex items-center gap-2">
                        <input type="number" data-type="${typeName}" value="${currentPrice}" 
                               class="price-config-input w-24 bg-white border rounded-lg p-1 text-right font-black text-blue-600 outline-none">
                        <span class="text-[9px] font-bold text-slate-300 uppercase italic">đ/h</span>
                    </div>
                </div>`;
        });
        
        const container = document.getElementById('price-config-container');
        if(container) container.innerHTML = html || '<p class="text-center text-slate-400 text-xs py-4 italic">Vui lòng thêm loại sân ở tab Sân trước</p>';
    },

    // Lưu toàn bộ cấu hình (Giá theo loại, Giờ vàng, Hội viên)
    saveFullConfig: async () => {
        const priceInputs = document.querySelectorAll('.price-config-input');
        const priceList = {};
        priceInputs.forEach(input => {
            priceList[input.dataset.type] = Number(input.value);
        });

        const configData = {
            priceList: priceList,
            peakStart: document.getElementById('conf-peak-start').value,
            pricePeak: Number(document.getElementById('conf-price-peak').value),
            weekendUp: Number(document.getElementById('conf-weekend-up').value),
            mCopper: Number(document.getElementById('conf-m-copper').value),
            mSilver: Number(document.getElementById('conf-m-silver').value),
            mGold: Number(document.getElementById('conf-m-gold').value),
            rankSilver: Number(document.getElementById('conf-rank-silver').value),
            rankGold: Number(document.getElementById('conf-rank-gold').value)
        };

        await window.set(window.ref(window.db, 'config'), configData);
        alert("✅ Đã lưu cấu hình thành công!");
    },

    // --- PHẦN 2: QUẢN LÝ SÂN & TIMELINE ---

    renderHoursHeader: () => {
        const header = document.getElementById('timeline-hours-header');
        if (!header) return;
        let hH = '';
        for(let i = 6; i <= 22; i++) {
            hH += `<div class="flex-1 text-[10px] font-black text-slate-500 border-l pl-1">${i}:00</div>`;
        }
        header.innerHTML = hH;
    },

   // Component tạo Card riêng lẻ
    createCourtCard: (id, c) => {
        const isBusy = c.Trang_Thai === "Đang chơi";
        const isMaint = c.Trang_Thai === "Bảo trì";
        const deposit = Number(c.Da_Coc || 0);

        // Cấu hình theme dựa trên trạng thái
        let config = {
            class: 'card-ready',
            label: 'SẴN SÀNG',
            labelClass: 'text-blue-600',
            btnText: 'VÀO SÂN',
            btnClass: 'bg-blue-600',
            icon: 'fa-circle-check'
        };

        if (isBusy) {
            config = {
                class: 'card-busy',
                label: 'ĐANG CHƠI',
                labelClass: 'text-red-600',
                btnText: 'QUẢN LÝ',
                btnClass: 'bg-red-600',
                icon: 'fa-play-circle'
            };
        } else if (isMaint) {
            config = {
                class: 'card-maint',
                label: 'BẢO TRÌ',
                labelClass: 'text-slate-500',
                btnText: 'TẠM DỪNG',
                btnClass: 'bg-slate-400',
                icon: 'fa-screwdriver-wrench'
            };
        }

        const card = document.createElement('div');
        card.className = `sport-card-rect ${config.class} p-4 cursor-pointer relative group overflow-hidden shadow-sm`;
        card.dataset.id = id;
        card.dataset.status = c.Trang_Thai;

        // Nội dung card sử dụng Template String nhưng không chứa onclick
        card.innerHTML = `
            <img src="image_8e8406.png" class="court-bg-icon-top-right w-20 opacity-5 absolute top-2 right-2" alt="bg">
            <div class="flex flex-col h-full z-10 relative">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex flex-col">
                        <span class="text-[13px] font-[900] text-slate-800 uppercase tracking-tighter">${c.Ten_San}</span>
                        <span class="text-[8px] font-black ${config.labelClass} uppercase tracking-widest mt-0.5 flex items-center gap-1">
                            <i class="fa-solid ${config.icon} text-[7px]"></i> ${config.label}
                        </span>
                    </div>
                    ${isBusy ? `<span class="h-2 w-2 rounded-full status-dot-active"></span>` : ''}
                </div>

                <div class="flex-1 flex flex-col justify-center py-2">
                    ${isBusy ? `
                        <div>
                            <p class="text-[13px] font-[900] text-slate-900 uppercase truncate mb-1">${c.Ten_Khach || 'Khách lẻ'}</p>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-black text-red-600 flex items-center bg-white px-2 py-0.5 rounded-md border border-red-50">
                                    <i class="fa-regular fa-clock mr-1"></i> ${c.Gio_Vao || '--:--'}
                                </span>
                            </div>
                        </div>
                    ` : `
                        <div class="flex items-center opacity-20 group-hover:opacity-100 transition-opacity">
                            <span class="text-[9px] font-black text-slate-400 italic uppercase tracking-widest">Sẵn sàng đón khách</span>
                        </div>
                    `}
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-200/50 mt-auto">
                    <div class="min-h-[14px]">
                        ${isBusy && deposit > 0 ? `
                            <span class="text-[10px] font-black text-orange-600 tracking-tighter">
                                <i class="fa-solid fa-wallet mr-1 text-[8px]"></i>${deposit.toLocaleString()}
                            </span>
                        ` : `<i class="fa-solid fa-table-tennis-paddle-ball text-slate-200 text-xs"></i>`}
                    </div>
                    <button class="h-7 px-4 rounded-lg font-black text-[9px] uppercase tracking-wider text-white shadow-sm transition-all active:scale-95 ${config.btnClass}">
                        ${config.btnText}
                    </button>
                </div>
            </div>`;
        return card;
    },

    // Hàm Render chính dùng DocumentFragment để tối ưu tốc độ
    renderCourts: () => {
        const container = document.getElementById('grid-courts');
        if (!container) return;
        
        container.className = "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5 p-2";
        const courts = window.dataCache.courts || {};
        
        // Sử dụng Fragment để tránh reflow nhiều lần
        const fragment = document.createDocumentFragment();
        
        Object.entries(courts).forEach(([id, c]) => {
            fragment.appendChild(app.createCourtCard(id, c));
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);

        // Event Delegation: Gắn sự kiện click 1 lần duy nhất tại container cha
        if (!container.dataset.eventInitialized) {
            container.addEventListener('click', (e) => {
                const card = e.target.closest('.sport-card-rect');
                if (!card) return;
                
                const id = card.dataset.id;
                const status = card.dataset.status;

                if (status === "Đang chơi") {
                    app.showDetail(id);
                } else if (status === "Sẵn sàng") {
                    document.getElementById('checkin-court-id').value = id;
                    ui.openModal('checkin');
                } else {
                    console.log("Sân đang bảo trì");
                }
            });
            container.dataset.eventInitialized = "true";
        }
    },

    renderCourtsTable: () => {
        const tableBody = document.getElementById('list-courts-table');
        if (!tableBody) return;
        const courts = window.dataCache.courts || {};
        let html = '';
        Object.entries(courts).forEach(([id, c]) => {
            const isMaint = c.Trang_Thai === "Bảo trì";
            html += `
                <tr class="border-b font-bold text-sm">
                    <td class="p-4 uppercase text-slate-700">${c.Ten_San}</td>
                    <td class="p-4 text-slate-400">${c.Loai_San || "Standard"}</td>
                    <td class="p-4">
                        <span class="px-2 py-1 rounded text-[9px] font-black uppercase ${isMaint ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}">
                            ${c.Trang_Thai}
                        </span>
                    </td>
                    <td class="p-4 text-right whitespace-nowrap">
                        <button onclick="app.toggleMaintenance('${id}', '${c.Trang_Thai}')" class="p-2 text-slate-400 hover:text-amber-500"><i class="fa-solid fa-wrench"></i></button>
                        <button onclick='ui.openModal("court", "${id}", ${JSON.stringify(c).replace(/"/g, '&quot;')})' class="p-2 text-blue-500"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="app.deleteItem('courts/${id}')" class="p-2 text-rose-300 hover:text-red-500"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
        });
        tableBody.innerHTML = html || '<tr><td colspan="4" class="p-10 text-center text-slate-300 italic">Chưa có dữ liệu</td></tr>';
    },

    reloadTimeline: () => {
    const vD = document.getElementById('view-date')?.value;
    const container = document.getElementById('timeline-rows');
    if (!container || !vD) return;
    
    let html = '';
    const courts = window.dataCache.courts || {};
    const bookings = window.dataCache.bookings || {};
    
    Object.entries(courts).forEach(([cId, court]) => {
        const isMaint = court.Trang_Thai === "Bảo trì";
        const bks = Object.entries(bookings).filter(([id, b]) => b.Court_ID === cId && b.Ngay === vD);
        
        html += `<div class="flex items-center gap-2 ${isMaint ? 'opacity-60' : ''}">
            <div class="w-24 font-black text-[10px] uppercase truncate ${isMaint ? 'text-slate-300' : 'text-slate-500'}">${court.Ten_San}</div>
            
            <div class="flex-1 h-10 ${isMaint ? 'bg-slate-200 timeline-grid-maint' : 'bg-slate-100'} rounded-xl relative timeline-grid border border-slate-200/50">`;

        // 1. Vẽ các ô lưới thời gian (Vùng nhấp để đặt lịch)
        for(let i = 6; i <= 22; i++) {
            if (isMaint) {
                html += `<div onclick="alert('⚠️ Sân ${court.Ten_San} hiện đang bảo trì, không thể đặt lịch!')" 
                              class="absolute h-full z-10 cursor-not-allowed" 
                              style="left:${(i - 6) * 100 / 17}%; width:${100 / 17}%;"></div>`;
            } else {
                html += `<div onclick="ui.clickTimeline('${cId}', ${i})" 
                              class="absolute h-full hover:bg-blue-500/10 transition-colors z-10 cursor-cell" 
                              style="left:${(i - 6) * 100 / 17}%; width:${100 / 17}%;"></div>`;
            }
        }

        // 2. Vẽ các lịch đã đặt sẵn
        bks.forEach(([id, b]) => {
            const [hS, mS] = (b.Bat_Dau || "06:00").split(':').map(Number);
            const [hE, mE] = (b.Ket_Thuc || "07:00").split(':').map(Number);
            const left = (hS - 6 + mS / 60) * (100 / 17);
            const width = (hE - hS + (mE - mS) / 60) * (100 / 17);
            
            // Hiển thị 1 dòng nếu thanh dài (> 8% độ rộng), ngược lại tự xuống dòng nhờ flex-wrap
            html += `
                <div onclick="event.stopPropagation(); ui.openModal('manage-booking', '${id}', ${JSON.stringify(b).replace(/"/g, '&quot;')})" 
                     class="timeline-slot bg-blue-600 text-white flex flex-wrap items-center content-center px-1.5 shadow-sm border-l-2 border-white/30 overflow-hidden" 
                     style="left:${left}%; width:${width}%; z-index:30; position:absolute; height: 32px; top: 4px; border-radius: 6px; cursor: pointer;">
                    
                    <span class="font-black uppercase text-[8px] truncate mr-1" style="max-width: 100%;">
                        ${b.Ten_Khach}
                    </span>
                    
                    <span class="text-[7px] font-bold opacity-90 whitespace-nowrap">
                        (${b.Bat_Dau}-${b.Ket_Thuc})
                    </span>
                </div>`;
        });
        
        html += `</div></div>`;
    });
    
    container.innerHTML = html;
},
    // --- HÀM LƯU LỊCH ĐẶT SÂN ---
   saveBooking: async () => {
    const courtId = document.getElementById('b-court-id').value;
    const dateStr = document.getElementById('b-date').value;
    const start = document.getElementById('b-start').value;
    const end = document.getElementById('b-end').value;
    const type = document.querySelector('input[name="b-customer-type"]:checked').value;
    const note = document.getElementById('b-note').value;
    const deposit = parseInt(document.getElementById('b-deposit').value) || 0;

    let name = "";
    let phone = "";
    let memberId = "";

    if (type === 'Hội viên') {
        name = document.getElementById('b-member-search').value;
        memberId = document.getElementById('b-member-id').value;
        phone = document.getElementById('b-phone').value;
        if (!memberId) return alert("Vui lòng chọn đúng hội viên!");
    } else {
        name = document.getElementById('b-name').value;
        phone = document.getElementById('b-phone').value;
    }

    if (!courtId || !dateStr || !start || !end || !name) {
        return alert("Vui lòng điền đầy đủ thông tin!");
    }

    // --- BỔ SUNG: HÀM KIỂM TRA TRÙNG LỊCH ---
    const isOverlapping = (checkDate, checkStart, checkEnd) => {
        const allBookings = Object.values(window.dataCache.bookings || {});
        return allBookings.some(b => {
            // Chỉ kiểm tra những lịch của cùng sân và cùng ngày
            if (b.Court_ID === courtId && b.Ngay === checkDate) {
                // Logic: (Bắt đầu mới nằm trong khoảng cũ) HOẶC (Kết thúc mới nằm trong khoảng cũ) HOẶC (Bao trùm lịch cũ)
                return (checkStart >= b.Bat_Dau && checkStart < b.Ket_Thuc) || 
                       (checkEnd > b.Bat_Dau && checkEnd <= b.Ket_Thuc) || 
                       (checkStart <= b.Bat_Dau && checkEnd >= b.Ket_Thuc);
            }
            return false;
        });
    };

    try {
        const now = new Date();
        const isRepeat = document.getElementById('b-repeat')?.checked;
        const repeatWeeks = parseInt(document.getElementById('b-repeat-weeks')?.value || 1);
        const selectedDays = Array.from(document.querySelectorAll('input[name="repeat-days"]:checked')).map(el => parseInt(el.value));

        const savePromises = [];
        const conflictDates = []; // Lưu danh sách các ngày bị trùng lịch

        if (isRepeat && selectedDays.length > 0) {
            // Logic đặt lịch cố định hàng tuần
            for (let w = 0; w < repeatWeeks; w++) {
                selectedDays.forEach(dayOfWeek => {
                    let d = new Date(dateStr);
                    d.setDate(d.getDate() + (w * 7) + (dayOfWeek - d.getDay() + 7) % 7);
                    const targetDate = d.toISOString().split('T')[0];

                    // Kiểm tra trùng lịch cho từng ngày trong chuỗi lặp
                    if (isOverlapping(targetDate, start, end)) {
                        conflictDates.push(targetDate);
                    } else {
                        const bookingId = 'BK-RP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
                        const bData = {
                            Court_ID: courtId,
                            Ngay: targetDate,
                            Bat_Dau: start, Ket_Thuc: end,
                            Ten_Khach: name, SDT: phone,
                            Loai_Khach: type, Member_ID: memberId,
                            Ghi_Chu: note + (w > 0 ? " (Lịch cố định)" : ""),
                            Tien_Coc: (w === 0 && savePromises.length === 0) ? deposit : 0, 
                            Trang_Thai: "Chưa nhận sân",
                            Thoi_Gian_Tao: now.toLocaleString('vi-VN')
                        };
                        savePromises.push(window.set(window.ref(window.db, 'bookings/' + bookingId), bData));
                    }
                });
            }
        } else {
            // Kiểm tra trùng lịch cho đặt đơn lẻ
            if (isOverlapping(dateStr, start, end)) {
                return alert(`⚠️ Trùng lịch! Khoảng thời gian ${start} - ${end} ngày ${dateStr} sân này đã có người đặt.`);
            }

            const bookingId = 'BK' + Date.now();
            const bookingData = {
                Court_ID: courtId,
                Ngay: dateStr,
                Bat_Dau: start, Ket_Thuc: end,
                Ten_Khach: name, SDT: phone,
                Loai_Khach: type, Member_ID: memberId,
                Ghi_Chu: note, Tien_Coc: deposit,
                Trang_Thai: "Chưa nhận sân",
                Thoi_Gian_Tao: now.toLocaleString('vi-VN')
            };
            savePromises.push(window.set(window.ref(window.db, 'bookings/' + bookingId), bookingData));
        }

        // Nếu có ngày bị trùng trong chuỗi lặp, cảnh báo người dùng
        if (conflictDates.length > 0) {
            const msg = `Có ${conflictDates.length} ngày bị trùng lịch (${conflictDates.slice(0, 2).join(', ')}...). \n\nBạn có muốn bỏ qua các ngày trùng và đặt những ngày còn lại không?`;
            if (!confirm(msg)) return;
        }

        if (savePromises.length === 0) {
            return alert("❌ Không có lịch nào được đặt do tất cả đều bị trùng!");
        }

        // --- 1. TẠO HÓA ĐƠN CỌC (Chỉ tạo nếu lưu thành công ít nhất 1 lịch) ---
        if (deposit > 0) {
            const billId = 'BILL-DEP-' + Date.now();
            const depositBill = {
                Thoi_Gian: now.toLocaleString('vi-VN'),
                Ngay_Thang: now.toISOString().split('T')[0],
                Khach_Hang: name, SDT: phone,
                Tong_Tien: deposit, PTTT: "Chuyển khoản",
                Noi_Dung: `Thu tiền cọc đặt ${document.getElementById('b-court-id').options[document.getElementById('b-court-id').selectedIndex].text} (Ngày bắt đầu ${dateStr})`,
                Ten_San: courtId, Loai_HD: "Tiền cọc"
            };
            await window.set(window.ref(window.db, 'bills/' + billId), depositBill);
        }

        // Đợi tất cả các lịch đặt hợp lệ được lưu xong
        await Promise.all(savePromises);
        
        alert(`✅ Đã đặt thành công ${savePromises.length} lịch!`);
        window.ui.closeModal('booking');
        
        // Reset form
        document.getElementById('b-name').value = '';
        document.getElementById('b-phone').value = '';
        document.getElementById('b-note').value = '';
        document.getElementById('b-deposit').value = '';
        if (document.getElementById('b-repeat')) document.getElementById('b-repeat').checked = false;
        document.querySelectorAll('input[name="repeat-days"]').forEach(el => el.checked = false);
        
    } catch (e) {
        console.error(e);
        alert("Lỗi: " + e.message);
    }
},
    // --- HÀM CẬP NHẬT LỊCH ĐẶT (Sửa lịch) ---
    updateBooking: async () => {
    const id = document.getElementById('manage-b-id').value;
    if (!id) return alert("Không tìm thấy mã lịch đặt!");

    const name = document.getElementById('manage-b-name').value;
    const phone = document.getElementById('manage-b-phone').value;
    const start = document.getElementById('manage-b-start').value;
    const end = document.getElementById('manage-b-end').value;
    const note = document.getElementById('manage-b-note').value;
    
    // LẤY GIÁ TRỊ TIỀN CỌC MỚI TỪ GIAO DIỆN
    const newDeposit = parseInt(document.getElementById('manage-b-deposit').value) || 0;
    
    // Lấy dữ liệu cũ từ bộ nhớ tạm để so sánh chênh lệch
    const oldBooking = window.dataCache.bookings[id];

    if (!name || !start || !end) {
        return alert("Vui lòng không để trống Tên và Giờ chơi!");
    }

    try {
        const now = new Date();
        const updateData = {
            Ten_Khach: name,
            SDT: phone,
            Bat_Dau: start,
            Ket_Thuc: end,
            Ghi_Chu: note,
            Tien_Coc: newDeposit, // Cập nhật số tiền cọc mới
            Thoi_Gian_Sua: now.toLocaleString('vi-VN')
        };

        // 1. Cập nhật thông tin lịch đặt lên Firebase
        await window.update(window.ref(window.db, 'bookings/' + id), updateData);
        
        // 2. LOGIC ĐIỀU CHỈNH HÓA ĐƠN TIỀN CỌC (Nếu có thay đổi tiền)
        const oldDeposit = Number(oldBooking?.Tien_Coc || 0);
        
        if (newDeposit !== oldDeposit) {
            const diff = newDeposit - oldDeposit;
            const adjBillId = 'BILL-ADJ-' + Date.now();
            
            const adjBill = {
                Thoi_Gian: now.toLocaleString('vi-VN'),
                Ngay_Thang: now.toISOString().split('T')[0],
                Khach_Hang: name,
                SDT: phone,
                Tong_Tien: diff, // Ghi nhận phần chênh lệch (âm hoặc dương)
                PTTT: "Chuyển khoản",
                Noi_Dung: `Điều chỉnh cọc ${window.dataCache.courts[oldBooking.Court_ID]?.Ten_San || oldBooking.Court_ID} (Lịch đặt ${id}: ${oldDeposit.toLocaleString()}đ -> ${newDeposit.toLocaleString()}đ)`,
                Ten_San: oldBooking.Court_ID,
                Loai_HD: "Điều chỉnh cọc"
            };

            // Lưu vào nhánh bills để tab Hóa đơn ghi nhận biến động tiền
            await window.set(window.ref(window.db, 'bills/' + adjBillId), adjBill);
            console.log("✅ Đã tạo hóa đơn điều chỉnh chênh lệch cọc:", diff);
        }

        alert("✅ Đã cập nhật lịch đặt và điều chỉnh dòng tiền thành công!");
        window.ui.closeModal('manage-booking');
    } catch (e) {
        console.error("Lỗi cập nhật:", e);
        alert("Lỗi: " + e.message);
    }
},

    // --- HÀM HỦY LỊCH ĐẶT ---
    confirmDeleteBooking: async () => {
        const id = document.getElementById('manage-b-id').value;
        if (!id) return;

        if (confirm("Bạn có chắc chắn muốn HỦY lịch đặt này không?")) {
            try {
                await window.remove(window.ref(window.db, 'bookings/' + id));
                alert("🗑️ Đã xóa lịch đặt!");
                window.ui.closeModal('manage-booking');
            } catch (e) {
                alert("Lỗi khi xóa: " + e.message);
            }
        }
    },

    // --- HÀM CHUYỂN LỊCH ĐẶT THÀNH ĐANG CHƠI (CHECK-IN) ---
    confirmCheckinFromBooking: async () => {
    // 1. Lấy ID lịch đặt từ modal đang mở
    const bookingId = document.getElementById('manage-b-id').value;
    if (!bookingId) return alert("Không tìm thấy mã lịch đặt!");

    const b = window.dataCache.bookings[bookingId];
    if (!b) return alert("Dữ liệu lịch đặt không tồn tại!");

    try {
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

        // 2. Khai báo biến lấy tiền cọc từ booking
        const depositAmount = Number(b.Tien_Coc || 0); 

        const courtUpdate = {
            Trang_Thai: "Đang chơi",
            Ten_Khach: b.Ten_Khach || "Khách đặt lịch",
            SDT: b.SDT || "",
            Gio_Vao: currentTime,
            Member_ID: b.Member_ID || "",
            Loai_Khach: b.Loai_Khach || "Vãng lai",
            Da_Coc: depositAmount // QUAN TRỌNG: Lưu số tiền này vào dữ liệu sân
        };

        
        // 3. Cập nhật lên Firebase
        await window.update(window.ref(window.db, `courts/${b.Court_ID}`), courtUpdate);
        
        // 4. Xóa lịch đặt trên timeline
        await window.remove(window.ref(window.db, `bookings/${bookingId}`));

        alert(`✅ Check-in thành công! (Tiền cọc: ${depositAmount.toLocaleString()}đ)`);
        window.ui.closeModal('manage-booking');
        
    } catch (e) {
        console.error("Lỗi Check-in:", e);
        alert("Lỗi: " + e.message);
    }
},

// --- HÀM NHẬN SÂN NHANH (CHECK-IN CHO KHÁCH VÃNG LAI) ---
    confirmCheckin: async () => {
    // 1. Lấy dữ liệu từ các ID trong Modal Nhận sân (Check-in)
    const id = document.getElementById('checkin-court-id').value; 
    const name = document.getElementById('checkin-name').value.trim();
    const phone = document.getElementById('checkin-phone').value.trim();
    
    // BỔ SUNG: Lấy Member_ID từ ô ẩn (input hidden)
    const memberId = document.getElementById('checkin-member-id')?.value || null;
    
    const deposit = parseInt(document.getElementById('checkin-deposit')?.value || 0);

    if (!id) return alert("Không xác định được sân!");
    if (!name) return alert("Vui lòng nhập tên khách hàng!");

    try {
        const now = new Date();
        // Định dạng giờ vào HH:mm
        const gioVao = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

        // 2. Cập nhật dữ liệu vào nhánh Sân (courts)
        const courtUpdate = {
            Trang_Thai: "Đang chơi",
            Ten_Khach: name,
            SDT: phone,
            Member_ID: memberId, // QUAN TRỌNG: Lưu ID hội viên vào đây để thanh toán bằng ví
            Gio_Vao: gioVao,
            Da_Coc: deposit, 
            Thoi_Gian_Cap_Nhat: now.getTime()
        };

        await window.update(window.ref(window.db, `courts/${id}`), courtUpdate);

        // 3. TẠO HÓA ĐƠN CỌC (Nếu khách có đóng tiền cọc)
        if (deposit > 0) {
            const billId = 'BILL-DEP-' + Date.now();
            const depositBill = {
                Thoi_Gian: now.toLocaleString('vi-VN'),
                Ngay_Thang: now.toISOString().split('T')[0],
                Khach_Hang: name,
                Member_ID: memberId, // Gắn ID hội viên vào bill cọc luôn
                SDT: phone,
                Tong_Tien: deposit,
                PTTT: "Tiền mặt", 
                Noi_Dung: `Thu tiền cọc nhận sân nhanh: ${id}`,
                Ten_San: id,
                Loai_HD: "Tiền cọc"
            };
            await window.set(window.ref(window.db, 'bills/' + billId), depositBill);
        }

        alert("✅ Đã nhận sân thành công!");
        
        // RESET ID HỘI VIÊN để không bị lặp cho khách sau
        if(document.getElementById('checkin-member-id')) document.getElementById('checkin-member-id').value = "";
        
        window.ui.closeModal('checkin'); 
        
    } catch (e) {
        console.error("Lỗi Check-in:", e);
        alert("Lỗi: " + e.message);
    }
},

    // --- PHẦN 3: POS & NGHIỆP VỤ KHÁCH HÀNG ---

    saveCourt: () => {
        const id = document.getElementById('court-id').value || 'S' + Date.now();
        const name = document.getElementById('c-name').value;
        const type = document.getElementById('c-type').value;
        if(!name) return alert("Nhập tên sân!");
        window.update(window.ref(window.db, 'courts/' + id), { id, Ten_San: name, Loai_San: type, Trang_Thai: "Sẵn sàng" })
              .then(() => ui.closeModal('court'));
    },

    showDetail: (id) => {
    window.selectedCourtId = id; 
    const c = window.dataCache.courts[id];
    if (!c) return;

    const elName = document.getElementById('detail-court-name');
    const elCustomer = document.getElementById('detail-customer');
    const elStart = document.getElementById('detail-start-time');
    
    if (elName) elName.innerText = c.Ten_San;
    if (elCustomer) elCustomer.innerText = c.Ten_Khach || "Khách lẻ";
    if (elStart) elStart.innerText = c.Gio_Vao || "--:--";

    // --- Nạp danh sách sân trống ---
    const transferSelect = document.getElementById('transfer-to-court-id');
    if (transferSelect) {
        const courts = window.dataCache.courts || {};
        let transferHtml = '<option value="">-- Chọn sân trống --</option>';
        Object.entries(courts).forEach(([courtId, courtData]) => {
            if (courtData.Trang_Thai === "Sẵn sàng" && courtId !== id) {
                transferHtml += `<option value="${courtId}">${courtData.Ten_San}</option>`;
            }
        });
        transferSelect.innerHTML = transferHtml;
    }

    // --- ĐOẠN SỬA ĐỔI TRONG showDetail ---
    let listHtml = '';
    
    // ƯU TIÊN lấy từ Playing.Services trước vì đây là dữ liệu sân đang chơi
    let services = {};
    if (c.Playing && c.Playing.Services) {
        services = c.Playing.Services;
    } else if (c.Dich_Vu) {
        services = c.Dich_Vu;
    }
    
    const entries = Object.entries(services);
    if (entries.length === 0) {
        listHtml = `
            <div class="flex flex-col items-center py-8 opacity-20">
                <i class="fa-solid fa-box-open text-3xl mb-2"></i>
                <p class="text-[10px] font-black uppercase tracking-widest">Chưa có dịch vụ</p>
            </div>`;
    } else {
        entries.forEach(([sid, item]) => {
            // Kiểm tra xem item có hợp lệ không
            if (!item) return;

            const tenMon = item.Ten_Mon || item.Ten || item.Name || "Món không tên";
            const soLuong = Number(item.So_Luong || item.SL || item.Qty || 0);
            const gia = Number(item.Gia || item.Price || 0);

            listHtml += `
                <div class="flex justify-between items-center bg-white p-3 rounded-2xl mb-2 border border-slate-100 shadow-sm">
                    <div class="flex-1">
                        <div class="text-[11px] font-[900] text-slate-800 uppercase leading-none mb-1">${tenMon}</div>
                        <div class="text-[10px] text-blue-600 font-black">${soLuong} x ${gia.toLocaleString()}đ</div>
                    </div>
                    <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <button onclick="app.updateServiceQty('${id}', '${sid}', -1)" 
                                class="w-6 h-6 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 text-slate-400 hover:text-rose-500 active:scale-90 transition-all">-</button>
                        
                        <span class="text-xs font-[900] text-slate-700 w-4 text-center">${soLuong}</span>
                        
                        <button onclick="app.updateServiceQty('${id}', '${sid}', 1)" 
                                class="w-6 h-6 flex items-center justify-center bg-blue-600 rounded-lg shadow-sm text-white hover:bg-blue-700 active:scale-90 transition-all">+</button>
                    </div>
                </div>`;
        });
    }
    // --- KẾT THÚC ĐOẠN SỬA ---

    const elList = document.getElementById('detail-services-list');
    if (elList) elList.innerHTML = listHtml;
    window.ui.openModal('court-detail');
},

    updateServiceQty: async (courtId, sid, change) => {
    try {
        const court = window.dataCache.courts[courtId];
        const originalService = window.dataCache.services[sid];
        if (!court || !originalService) return;

        let serviceData = null;
        let finalPath = "";

        // 1. Xác định đường dẫn dữ liệu tại sân
        if (court.Playing?.Services?.[sid]) {
            serviceData = court.Playing.Services[sid];
            finalPath = `courts/${courtId}/Playing/Services/${sid}`;
        } else if (court.Dich_Vu?.[sid]) {
            serviceData = court.Dich_Vu[sid];
            finalPath = `courts/${courtId}/Dich_Vu/${sid}`;
        }

        if (!serviceData || !finalPath) return;

        const currentQtyInCourt = Number(serviceData.So_Luong || 0);
        const newQtyInCourt = currentQtyInCourt + change;
        const isProduct = originalService.Loai_DV !== "DỊCH VỤ";

        // 2. LOGIC TĂNG (+1): Trừ kho ảo trong Cache
        if (change === 1) {
            if (isProduct && (Number(originalService.Ton_Kho) || 0) <= 0) {
                return alert("Kho không đủ hàng!");
            }
            if (isProduct) originalService.Ton_Kho = Number(originalService.Ton_Kho) - 1;
        }

        // 3. LOGIC GIẢM (-1) HOẶC XÓA (về 0)
        if (newQtyInCourt <= 0) {
            if (!confirm(`Xác nhận xóa món này khỏi sân?`)) return;
            // HOÀN KHO ẢO: Cộng trả lại toàn bộ số lượng đang có tại sân vào kho tổng
            if (isProduct) {
                originalService.Ton_Kho = Number(originalService.Ton_Kho || 0) + currentQtyInCourt;
            }
            await window.remove(window.ref(window.db, finalPath));
        } else {
            // Nếu chỉ giảm số lượng (vẫn còn > 0): Cộng trả 1 đơn vị vào kho tổng
            if (change === -1 && isProduct) {
                originalService.Ton_Kho = Number(originalService.Ton_Kho || 0) + 1;
            }

            // Cập nhật số lượng mới tại Sân trên Firebase
            await window.update(window.ref(window.db, finalPath), { 
                So_Luong: newQtyInCourt, SL: newQtyInCourt, Qty: newQtyInCourt 
            });
        }

        // 4. ĐỒNG BỘ GIAO DIỆN
        if (app.renderPosProducts) app.renderPosProducts(); // Cập nhật số Tồn hiển thị
        if (app.renderServicesTable) app.renderServicesTable(); // Cập nhật bảng kho
        app.showDetail(courtId); // Vẽ lại bảng dịch vụ tại sân

    } catch (e) {
        console.error("Lỗi cập nhật dịch vụ sân:", e);
    }
},

    // Hàm vẽ bảng danh sách cho Tab Dịch vụ
    renderServicesTable: () => {
        const tableBody = document.getElementById('list-services-table');
        if (!tableBody) return;

        const services = window.dataCache.services || {};
        let html = '';

        Object.entries(services).forEach(([id, s]) => {
            html += `
                <tr class="border-b hover:bg-slate-50 transition-colors font-bold text-sm">
                    <td class="p-4 w-20">
                        <img src="${s.Hinh_Anh || 'https://via.placeholder.com/50'}" class="w-10 h-10 rounded-lg object-cover border shadow-sm">
                    </td>
                    <td class="p-4 uppercase text-slate-700">${s.Ten_Dich_Vu}</td>
                    <td class="p-4 text-center text-[10px] text-slate-400 uppercase">${s.Loai_DV || 'Chung'}</td>
                    <td class="p-4 text-emerald-600">${Number(s.Gia_Ban || 0).toLocaleString()}đ</td>
                    <td class="p-4 text-center ${Number(s.Ton_Kho) <= 5 ? 'text-rose-500' : 'text-slate-500'}">${s.Ton_Kho || 0}</td>
                    <td class="p-4 text-right whitespace-nowrap">
                        <button onclick='ui.openModal("service", "${id}", ${JSON.stringify(s).replace(/"/g, '&quot;')})' class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="app.deleteItem('services/${id}')" class="p-2 text-rose-300 hover:text-red-500">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });

        tableBody.innerHTML = html || '<tr><td colspan="6" class="p-10 text-center text-slate-300 italic">Chưa có dịch vụ nào</td></tr>';
    },

      deleteServiceCategory: async (id) => {
    if (confirm("Xác nhận xóa phân loại này?")) {
        await window.remove(window.ref(window.db, 'settings/serviceCategories/' + id));
    }
},
    
    // Thêm vào window.app = { ... }
renderServiceCategories: () => {
    const listContainer = document.getElementById('cat-list-display'); // Vùng hiện danh sách quản lý
    const selectBox = document.getElementById('s-category');           // Ô chọn trong Modal thêm món
    
    const cats = window.dataCache.serviceCategories || {};
    const entries = Object.entries(cats);

    // 1. Cập nhật danh sách trong Modal Quản lý
    if (listContainer) {
        if (entries.length > 0) {
            let htmlList = '';
            entries.forEach(([id, name]) => {
                htmlList += `
                    <div class="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-2">
                        <span class="font-black text-slate-700 text-xs uppercase italic">${name}</span>
                        <button onclick="app.deleteCategory('${id}')" class="text-rose-500 p-2">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>`;
            });
            listContainer.innerHTML = htmlList;
        } else {
            listContainer.innerHTML = `<div class="text-center py-10 opacity-30 italic text-xs">Chưa có phân loại</div>`;
        }
    }

    // 2. Cập nhật Ô chọn (Select) trong Modal Thêm dịch vụ
    if (selectBox) {
        let htmlSelect = '<option value="">-- Chọn phân loại --</option>';
        entries.forEach(([id, name]) => {
            htmlSelect += `<option value="${name}">${name}</option>`;
        });
        selectBox.innerHTML = htmlSelect;
    }
},

deleteCategory: async (id) => {
    if (!confirm("Bạn có chắc muốn xóa phân loại này không?")) return;

    try {
        await window.set(window.ref(window.db, `settings/serviceCategories/${id}`), null);
        // Lưu ý: Firebase onValue sẽ tự động cập nhật lại danh sách sau khi xóa
    } catch (e) {
        alert("Lỗi khi xóa: " + e.message);
    }
},

addCategory: async () => {
    const input = document.getElementById('new-cat-name');
    const name = input.value.trim();

    if (!name) return alert("Vui lòng nhập tên loại dịch vụ!");

    try {
        // ĐẢM BẢO đường dẫn này khớp với onValue ở index.html
        const catRef = window.ref(window.db, 'settings/serviceCategories');
        const newRef = window.push(catRef); 
        
        await window.set(newRef, name);
        
        input.value = ""; 
        alert("✅ Đã thêm loại mới!");
    } catch (e) {
        console.error("Lỗi lưu loại dịch vụ:", e);
        alert("Lỗi: " + e.message);
    }
},

saveService: async () => {
    // 1. Lấy dữ liệu từ các ID trong Modal Dịch vụ
    const id = document.getElementById('service-id').value; // ID ẩn để phân biệt Thêm/Sửa
    const name = document.getElementById('s-name').value.trim();
    const category = document.getElementById('s-category').value;
    const price = Number(document.getElementById('s-price').value || 0);
    const stock = Number(document.getElementById('s-stock').value || 0);
    const img = document.getElementById('s-img').value.trim();

    // 2. Kiểm tra các trường bắt buộc
    if (!name) return alert("⚠️ Vui lòng nhập tên sản phẩm/dịch vụ!");
    if (!category) return alert("⚠️ Vui lòng chọn phân loại!");
    if (price < 0) return alert("⚠️ Giá bán không hợp lệ!");

    try {
        const serviceData = {
            Ten_Dich_Vu: name,
            Loai_DV: category,
            Gia_Ban: price,
            Ton_Kho: stock,
            Hinh_Anh: img || "https://placehold.co/100x100?text=No+Image",
            Ngay_Cap_Nhat: new Date().toLocaleString('vi-VN')
        };

        if (id) {
            // TRƯỜNG HỢP CHỈNH SỬA: Cập nhật dữ liệu cũ
            await window.update(window.ref(window.db, `services/${id}`), serviceData);
            alert("✅ Đã cập nhật dịch vụ thành công!");
        } else {
            // TRƯỜNG HỢP THÊM MỚI: Dùng push để tạo ID duy nhất
            const newListRef = window.push(window.ref(window.db, 'services'));
            await window.set(newListRef, {
                ...serviceData,
                Da_Ban: 0, // Khởi tạo số lượng đã bán
                Trang_Thai: "Kinh doanh"
            });
            alert("✅ Đã thêm dịch vụ mới thành công!");
        }

        // 3. Dọn dẹp form và đóng Modal
        app.resetServiceForm();
        if (window.ui && window.ui.closeModal) window.ui.closeModal('service');

    } catch (e) {
        console.error("Lỗi saveService:", e);
        alert("❌ Lỗi: " + e.message);
    }
},

// Hàm bổ trợ để xóa trắng form
resetServiceForm: () => {
    const fields = ['service-id', 's-name', 's-category', 's-price', 's-stock', 's-img'];
    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = (f === 's-price' || f === 's-stock') ? 0 : "";
    });
},

editService: (id) => {
    const s = window.dataCache.services[id];
    if (!s) return alert("Không tìm thấy dữ liệu dịch vụ!");

    // 1. Mở Modal trước để các thẻ input xuất hiện trong DOM
    window.ui.openModal('service');

    // 2. Dùng khoảng nghỉ 150ms để chắc chắn Modal đã hiển thị hoàn toàn
    setTimeout(() => {
        // Gán ID ẩn
        const elId = document.getElementById('service-id');
        if (elId) elId.value = id;

        // Gán các trường văn bản và số
        const fields = {
            's-name': s.Ten_Dich_Vu || "",
            's-price': s.Gia_Ban || 0,
            's-stock': s.Ton_Kho || 0,
            's-img': s.Hinh_Anh || ""
        };

        for (let key in fields) {
            const el = document.getElementById(key);
            if (el) el.value = fields[key];
        }

        // 3. Xử lý riêng cho ô chọn Loại dịch vụ (Select)
        const catSelect = document.getElementById('s-category');
        if (catSelect) {
            // Vẽ lại danh sách loại để chắc chắn có Option
            if (window.app.renderServiceCategories) window.app.renderServiceCategories();
            // Sau khi vẽ xong mới gán giá trị
            catSelect.value = s.Loai_DV || "";
        }
        
        console.log("✅ Đã đổ dữ liệu Edit cho món:", s.Ten_Dich_Vu);
    }, 150); 
},
    renderBills: () => {
    try {
        const tableBody = document.getElementById('list-bills-table');
        const totalRevLabel = document.getElementById('total-revenue');
        if (!tableBody) return;

        const from = document.getElementById('filter-bill-from')?.value || ""; 
        const to = document.getElementById('filter-bill-to')?.value || "";     
        const search = document.getElementById('filter-bill-search')?.value?.toLowerCase().trim() || "";
        
        let tH = ''; 
        let total = 0;
        const billsData = window.dataCache?.bills || {};

        // --- SỬA LOGIC SẮP XẾP TẠI ĐÂY ---
        // Chuyển object thành mảng và sắp xếp theo thời gian giảm dần (Mới nhất lên đầu)
        const entries = Object.entries(billsData).sort((a, b) => {
            const timeA = new Date(a[1].Ngay_Thang + ' ' + (a[1].Thoi_Gian?.split(' ')[0].includes(':') ? a[1].Thoi_Gian.split(' ')[0] : (a[1].Thoi_Gian?.split(' ')[1] || "00:00:00")));
            const timeB = new Date(b[1].Ngay_Thang + ' ' + (b[1].Thoi_Gian?.split(' ')[0].includes(':') ? b[1].Thoi_Gian.split(' ')[0] : (b[1].Thoi_Gian?.split(' ')[1] || "00:00:00")));
            
            // Nếu không lấy được thời gian từ chuỗi Thoi_Gian, dùng Key ID để so sánh dự phòng
            return (timeB - timeA) || (b[0].localeCompare(a[0]));
        });

        entries.forEach(([id, b]) => {
            if (!b) return;

            let billDate = b.Ngay_Thang || ""; 
            const matchDate = (!from || billDate >= from) && (!to || billDate <= to);
            
            // Lấy ngày hiển thị (lọc lấy phần có dấu /)
            let ngayHienThi = '-';
            if (b.Thoi_Gian) {
                const parts = b.Thoi_Gian.split(' ');
                ngayHienThi = parts.find(p => p.includes('/')) || parts[0];
            }

            let tenSanHienThi = b.Ten_San || "";
            if (!tenSanHienThi || tenSanHienThi.startsWith('S17')) {
                const courtInfo = window.dataCache.courts?.[b.Ten_San];
                tenSanHienThi = courtInfo ? courtInfo.Ten_San : (b.Ten_San || "Bán lẻ"); 
            }

            let noiDungHienThi = b.NoiDung || b.Noi_Dung || "";
            if (b.Items && Array.isArray(b.Items)) {
                noiDungHienThi = b.Items.map(i => `${i.Ten || i.name} (x${i.SL || i.qty || 1})`).join(", ");
            } 
            
            noiDungHienThi = noiDungHienThi.replace(/S\d{13}/g, "").replace(/\s+/g, " ").trim();

            const name = String(b.Khach_Hang || "Khách lẻ");
            const matchSearch = !search || name.toLowerCase().includes(search) || noiDungHienThi.toLowerCase().includes(search);

            if (matchDate && matchSearch) {
                const money = Number(b.Tong_Tien || 0);
                total += money;
                const moneyColor = money < 0 ? 'text-rose-600' : 'text-blue-600';

                tH += `
                <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-all font-bold text-sm">
                    <td class="p-4 text-slate-500 text-[11px] whitespace-nowrap">${ngayHienThi}</td>
                    <td class="p-4 uppercase text-slate-800">${name}</td>
                    <td class="p-4 text-slate-500 font-medium max-w-[400px]">
                        <div class="text-[11px] leading-relaxed">${noiDungHienThi}</div>
                    </td>
                    <td class="p-4 text-center">
                        <span class="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] uppercase font-black whitespace-nowrap">${b.PTTT || 'TM'}</span>
                    </td>
                    <td class="p-4 text-right ${moneyColor} font-black whitespace-nowrap">${money.toLocaleString()}đ</td>
                    <td class="p-4 text-right">
                        <div class="flex justify-end gap-2">
                            <button onclick="app.reprintBill('${id}')" class="text-slate-300 hover:text-blue-500"><i class="fa-solid fa-print text-xs"></i></button>
                            <button onclick="app.deleteItem('bills/${id}')" class="text-slate-200 hover:text-rose-500"><i class="fa-solid fa-trash-can text-xs"></i></button>
                        </div>
                    </td>
                </tr>`;
            }
        });

        tableBody.innerHTML = tH || '<tr><td colspan="6" class="p-10 text-center italic text-slate-400">Không có dữ liệu</td></tr>';
        if (totalRevLabel) totalRevLabel.innerText = total.toLocaleString() + 'đ';
    } catch (error) { console.error(error); }
},

renderPosProducts: (keyword = "") => {
        const container = document.getElementById('pos-product-list');
        const catContainer = document.getElementById('pos-category-list');
        if (!container) return;

        const services = window.dataCache.services || {};
        const categories = window.dataCache.serviceCategories || {};

        // 1. Vẽ danh sách nút Phân loại (Nước uống, Thuốc lá...)
        if (catContainer) {
            let catHtml = `<button onclick="app.renderPosProducts()" class="px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase whitespace-nowrap">Tất cả</button>`;
            Object.values(categories).forEach(catName => {
                catHtml += `<button onclick="app.filterPosByCategory('${catName}')" class="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase whitespace-nowrap hover:bg-blue-50">${catName}</button>`;
            });
            catContainer.innerHTML = catHtml;
        }

        // 2. Vẽ danh sách sản phẩm
        let html = '';
        Object.entries(services).forEach(([id, item]) => {
            // Lọc theo từ khóa tìm kiếm
            if (keyword && !item.Ten_Dich_Vu.toLowerCase().includes(keyword.toLowerCase())) return;

            const isOut = (Number(item.Ton_Kho) <= 0);
            
            html += `
                <div onclick="${isOut ? "alert('Hết hàng!')" : `app.addToCart('${id}')`}" 
                     class="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-blue-500 transition-all group ${isOut ? 'opacity-50' : ''}">
                    <div class="text-[8px] font-black text-blue-500 uppercase mb-1">${item.Loai_DV || "Chung"}</div>
                    <div class="font-bold text-slate-700 text-xs truncate uppercase group-hover:text-blue-600">${item.Ten_Dich_Vu}</div>
                    <div class="flex justify-between items-center mt-4 pt-2 border-t border-slate-50">
                        <span class="text-blue-600 font-black text-xs">${Number(item.Gia_Ban || 0).toLocaleString()}đ</span>
                        <span class="text-[9px] font-bold ${isOut ? 'text-rose-500' : 'text-slate-400'}">Tồn: ${item.Ton_Kho || 0}</span>
                    </div>
                </div>`;
        });

        container.innerHTML = html || '<div class="col-span-full text-center py-10 text-slate-400 italic text-xs uppercase">Không tìm thấy món nào</div>';
    },

    // Hàm lọc theo phân loại (Bổ sung thêm)
    filterPosByCategory: (catName) => {
        const services = window.dataCache.services || {};
        const container = document.getElementById('pos-product-list');
        let html = '';
        
        Object.entries(services).forEach(([id, item]) => {
            if (item.Loai_DV === catName) {
                html += `
                    <div onclick="app.addToCart('${id}')" class="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-blue-500 transition-all group">
                        <div class="text-[8px] font-black text-blue-500 uppercase mb-1">${item.Loai_DV}</div>
                        <div class="font-bold text-slate-700 text-xs truncate uppercase">${item.Ten_Dich_Vu}</div>
                        <div class="flex justify-between items-center mt-4 pt-2 border-t border-slate-50">
                            <span class="text-blue-600 font-black text-xs">${Number(item.Gia_Ban || 0).toLocaleString()}đ</span>
                            <span class="text-[9px] font-bold text-slate-400">Tồn: ${item.Ton_Kho || 0}</span>
                        </div>
                    </div>`;
            }
        });
        container.innerHTML = html || '<div class="col-span-full text-center py-10 text-slate-400 italic text-xs uppercase">Chưa có món trong loại này</div>';
    },

   // --- HÀM THÊM SẢN PHẨM VÀO GIỎ HÀNG POS ---
addToCart: (productId) => {
    const product = window.dataCache.services[productId];
    if (!product) return;

    const isDichVu = product.Loai_DV === "DỊCH VỤ";
    const currentStock = Number(product.Ton_Kho || 0);

    // 1. Kiểm tra kho (Chỉ kiểm tra trên Cache)
    if (!isDichVu && currentStock <= 0) {
        alert(`Sản phẩm "${product.Ten_Dich_Vu}" đã hết hàng!`);
        return;
    }

    // 2. TRỪ KHO ẢO TRÊN CACHE (Không dùng Transaction ở đây)
    if (!isDichVu) {
        product.Ton_Kho = currentStock - 1;
    }

    // 3. CẬP NHẬT GIỎ HÀNG
    const existingItem = window.posCart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        window.posCart.push({
            id: productId,
            name: product.Ten_Dich_Vu || "Sản phẩm", 
            price: Number(product.Gia_Ban || 0),
            qty: 1
        });
    }

    // 4. Vẽ lại cả 2 để đồng bộ số liệu hiển thị
    app.renderPOSCart();
    app.renderPosProducts(); 
},
    searchMemberForCheckin: (val) => {
    const input = val.trim().toLowerCase();
    const resultsDiv = document.getElementById('checkin-member-results');
    const nameInput = document.getElementById('checkin-name');
    const phoneInput = document.getElementById('checkin-phone');
    const idInput = document.getElementById('checkin-member-id');
    const members = window.dataCache?.members;

    if (!resultsDiv || !members) return;

    // Nếu xóa trắng ô nhập thì ẩn danh sách
    if (input.length < 1) {
        resultsDiv.classList.add('hidden');
        idInput.value = '';
        return;
    }

    // Lọc hội viên theo tên (Ten_HV) hoặc SĐT
    let html = '';
    let hasMatch = false;

    Object.entries(members).forEach(([id, m]) => {
        const ten = m.Ten_HV || "";
        const sdt = m.SDT || "";
        if (ten.toLowerCase().includes(input) || sdt.includes(input)) {
            hasMatch = true;
            html += `
                <div onclick="app.selectMemberForCheckin('${id}', '${ten}', '${sdt}')" 
                     class="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-all">
                    <div class="font-black text-blue-600">${ten}</div>
                    <div class="text-[10px] text-slate-500 font-bold">SĐT: ${sdt} - Hạng: ${m.Hang_HV || 'Đồng'}</div>
                </div>`;
        }
    });

    if (hasMatch) {
        resultsDiv.innerHTML = html;
        resultsDiv.classList.remove('hidden');
    } else {
        resultsDiv.classList.add('hidden');
        idInput.value = ''; // Nếu gõ tên lạ thì coi như khách vãng lai
    }
},
        // Thêm hàm này vào trong đối tượng app
selectMemberForCheckin: (id, name, phone) => {
    const nameInput = document.getElementById('checkin-name');
    const phoneInput = document.getElementById('checkin-phone');
    const idInput = document.getElementById('checkin-member-id');
    const resultsDiv = document.getElementById('checkin-member-results');

    if (nameInput) nameInput.value = name;
    if (phoneInput) phoneInput.value = phone;
    if (idInput) idInput.value = id;

    // Ẩn danh sách kết quả sau khi chọn
    if (resultsDiv) resultsDiv.classList.add('hidden');
    
    // Đổi màu để báo hiệu đã chọn đúng hội viên
    nameInput.style.color = "#2563eb"; 
    console.log("✅ Đã chọn hội viên ID:", id);
},
    
    renderMembersTable: () => {
        const tableBody = document.getElementById('list-members-table');
        if (!tableBody) return;

        const members = window.dataCache.members || {};
        const conf = window.dataCache.config || {};
        let html = '';

        Object.entries(members).forEach(([id, m]) => {
            const viDu = Number(m.Vi_Du || 0);
            // Xác định hạng dựa trên cấu hình (nếu có)
            const rank = m.Hang || 'Đồng';
            const colorClass = rank === 'Vàng' ? 'text-amber-500' : rank === 'Bạc' ? 'text-blue-500' : 'text-slate-400';

            html += `
                <tr class="border-b hover:bg-slate-50 transition-colors font-bold text-sm">
                    <td class="p-4 uppercase text-slate-700">${m.Ten_HV || "Không tên"}</td>
                    <td class="p-4 text-slate-500">${m.SDT || "---"}</td>
                    <td class="p-4 text-emerald-600">${viDu.toLocaleString()}đ</td>
                    <td class="p-4">
                        <span class="px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-black uppercase ${colorClass}">
                            ${rank}
                        </span>
                    </td>
                    <td class="p-4 text-right whitespace-nowrap">
                        <button onclick="ui.openModal('recharge', '${id}', ${JSON.stringify(m).replace(/"/g, '&quot;')})" 
                                class="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Nạp tiền">
                            <i class="fa-solid fa-wallet"></i>
                        </button>
                        <button onclick='ui.openModal("member", "${id}", ${JSON.stringify(m).replace(/"/g, '&quot;')})' 
                                class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="app.deleteItem('members/${id}')" 
                                class="p-2 text-rose-300 hover:text-red-500">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });

        tableBody.innerHTML = html || '<tr><td colspan="5" class="p-10 text-center text-slate-300 italic">Chưa có hội viên nào</td></tr>';
    },

    // --- HÀM TÍNH TOÁN BÁO CÁO TỔNG HỢP ---
  loadReports: () => {
        const from = document.getElementById('report-date-from').value;
        const to = document.getElementById('report-date-to').value;
        const bills = window.dataCache.bills || {};
        
        let totalRev = 0, count = 0, cash = 0, bank = 0, wallet = 0;
        let productMap = {}; // BỔ SUNG: Khởi tạo bộ đếm sản phẩm
        let hourlyData = new Array(24).fill(0);

        Object.values(bills).forEach(b => {
            // Chuẩn hóa ngày để so sánh
            const bDate = b.Ngay_Thang || (b.Thoi_Gian ? b.Thoi_Gian.split(' ')[0].split('/').reverse().join('-') : "");
            
            if (bDate >= from && bDate <= to) {
                const amt = Number(b.Tong_Tien || 0);
                totalRev += amt;
                count++;
                
                // Phân loại PTTT
                if (b.PTTT === "Tiền mặt") cash += amt;
                else if (b.PTTT === "Chuyển khoản") bank += amt;
                else wallet += amt;

                // Thống kê doanh thu theo giờ
                if (b.Thoi_Gian && b.Thoi_Gian.includes(' ')) {
                    const hour = parseInt(b.Thoi_Gian.split(' ')[1].split(':')[0]);
                    hourlyData[hour] += amt;
                }

                // --- LOGIC QUAN TRỌNG: QUÉT SẢN PHẨM TRONG HÓA ĐƠN ---
                // Kiểm tra các trường dữ liệu có thể chứa danh sách món
                const items = b.Chi_Tiet_Mon || b.Dich_Vu || {};
                Object.values(items).forEach(item => {
                    const name = item.Ten_Dich_Vu || item.Ten || item.Name;
                    const qty = Number(item.So_Luong || item.Qty || item.SL || 0);
                    if (name && qty > 0) {
                        productMap[name] = (productMap[name] || 0) + qty;
                    }
                });
            }
        });

        // 1. Vẽ Overview Stats (Giữ nguyên các thẻ con số của bạn)
        const statsOverview = document.getElementById('report-stats-overview');
        if (statsOverview) {
            statsOverview.innerHTML = `
                <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p class="text-[9px] font-black text-slate-400 uppercase italic">Tổng doanh thu</p>
                    <h4 class="text-xl font-black text-blue-600">${totalRev.toLocaleString()}đ</h4>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p class="text-[9px] font-black text-slate-400 uppercase italic">Tổng đơn hàng</p>
                    <h4 class="text-xl font-black text-slate-800">${count}</h4>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p class="text-[9px] font-black text-slate-400 uppercase italic">Tiền mặt / CK</p>
                    <h4 class="text-[11px] font-black text-slate-600">${cash.toLocaleString()} / ${bank.toLocaleString()}</h4>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p class="text-[9px] font-black text-slate-400 uppercase italic">Doanh thu ví</p>
                    <h4 class="text-xl font-black text-emerald-600">${wallet.toLocaleString()}đ</h4>
                </div>`;
        }

        // 2. Vẽ Biểu đồ giờ (Giữ nguyên logic của bạn)
        const chartContainer = document.getElementById('peak-hour-chart');
        if (chartContainer) {
            const maxVal = Math.max(...hourlyData) || 1;
            chartContainer.innerHTML = hourlyData.map((val, h) => `
                <div class="group relative flex-1 flex flex-col justify-end items-center h-full">
                    <div class="bg-blue-500 w-full rounded-t-sm transition-all group-hover:bg-blue-600" style="height: ${(val/maxVal)*100}%"></div>
                    <span class="text-[7px] font-bold text-slate-300 mt-1">${h}h</span>
                </div>`).join('');
        }

        // 3. VẼ TOP SẢN PHẨM (Phần bạn đang bị thiếu)
        const topProductsList = document.getElementById('top-products-list');
        if (topProductsList) {
            const sortedProducts = Object.entries(productMap)
                .sort((a, b) => b[1] - a[1]) // Sắp xếp giảm dần theo số lượng
                .slice(0, 5); // Lấy 5 món bán chạy nhất

            topProductsList.innerHTML = sortedProducts.map(([name, qty]) => `
                <div class="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-2">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-fire text-orange-500 text-[10px]"></i>
                        <span class="text-[10px] font-black text-slate-700 uppercase">${name}</span>
                    </div>
                    <span class="bg-slate-900 text-white px-3 py-1 rounded-full text-[9px] font-black italic">x${qty}</span>
                </div>`).join('');

            if (sortedProducts.length === 0) {
                topProductsList.innerHTML = '<p class="text-[10px] text-slate-400 italic text-center py-10">Chưa có dữ liệu món</p>';
            }
        }

        // 4. Vẽ Nhật ký giao dịch (Bổ sung Render)
        const recentList = document.getElementById('recent-bills-list');
        if (recentList) {
            const sortedBills = Object.values(bills)
                .filter(b => {
                    const bDate = b.Ngay_Thang || (b.Thoi_Gian ? b.Thoi_Gian.split(' ')[0].split('/').reverse().join('-') : "");
                    return bDate >= from && bDate <= to;
                })
                .sort((a, b) => (b.Thoi_Gian || "").localeCompare(a.Thoi_Gian || ""))
                .slice(0, 10);

            recentList.innerHTML = sortedBills.map(b => `
                <tr class="text-[11px] border-b border-slate-50">
                    <td class="py-4 font-bold text-slate-400 w-24">${b.Thoi_Gian ? b.Thoi_Gian.split(' ')[0] : '---'}</td>
                    <td class="py-4 font-black uppercase italic text-slate-700">${b.Khach_Hang || 'Khách lẻ'}</td>
                    <td class="py-4 text-right font-black text-blue-600">${Number(b.Tong_Tien || 0).toLocaleString()}đ</td>
                </tr>`).join('');
        }


        
           },

           // --- BỔ SUNG: Tìm kiếm món trong kho ---
    filterServiceDropdown: (keyword) => {
        const listContainer = document.getElementById('service-dropdown-list');
        if (!listContainer) return;
        const services = window.dataCache.services || {};
        const key = keyword.toLowerCase().trim();
        let html = '';
        
        Object.entries(services).forEach(([sid, s]) => {
            const name = s.Ten_Dich_Vu || "";
            if (name.toLowerCase().includes(key)) {
                const tonKho = s.Ton_Kho || 0;
                const gia = Number(s.Gia_Ban || 0);
                html += `
                    <div onclick="app.selectServiceItem('${sid}', '${name}')" 
                         class="p-3 cursor-pointer border-b border-slate-50 flex justify-between items-center hover:bg-blue-50 transition-all">
                        <div class="flex flex-col">
                            <span class="text-[11px] font-black text-slate-700 uppercase">${name}</span>
                            <span class="text-[9px] text-slate-400 font-bold italic text-blue-500">Giá: ${gia.toLocaleString()}đ</span>
                        </div>
                        <span class="text-[9px] font-bold text-slate-400">Tồn: ${tonKho}</span>
                    </div>`;
            }
        });
        listContainer.innerHTML = html || '<div class="p-3 text-[10px] text-slate-400 text-center uppercase italic">Không thấy món</div>';
        listContainer.classList.remove('hidden');
    },
    // --- BỔ SUNG: Chọn món từ danh sách gợi ý ---
    selectServiceItem: (id, name) => {
        document.getElementById('service-search-input').value = name;
        document.getElementById('add-service-id').value = id;
        document.getElementById('service-dropdown-list').classList.add('hidden');
    },

    // --- BỔ SUNG: Đẩy món vào Firebase của sân ---
    addServiceToCourt: async () => {
    const sid = document.getElementById('add-service-id').value; 
    const qty = parseInt(document.getElementById('add-service-qty').value) || 1;
    const courtId = window.selectedCourtId; 

    if(!courtId || !sid) return alert("Vui lòng chọn món từ danh sách!");
    
    // Lấy dữ liệu từ Cache (Nguồn sự thật hiện tại)
    const item = window.dataCache.services[sid];
    if(!item) return;

    // 1. KIỂM TRA KHO ẢO TRÊN CACHE
    if (item.Loai_DV !== "DỊCH VỤ" && (Number(item.Ton_Kho) || 0) < qty) {
        return alert("Kho không đủ hàng!");
    }

    try {
        // 2. CHỈ CẬP NHẬT DỊCH VỤ VÀO SÂN TRÊN FIREBASE
        // (Không trừ kho hệ thống ở đây)
        const serviceRef = window.ref(window.db, `courts/${courtId}/Dich_Vu/${sid}`);
        
        await window.runTransaction(serviceRef, (cur) => {
            if(cur) { 
                cur.So_Luong = (Number(cur.So_Luong) || 0) + qty; 
                return cur; 
            }
            return { 
                Ten_Mon: item.Ten_Dich_Vu, 
                Gia: Number(item.Gia_Ban), 
                So_Luong: qty 
            };
        });

        // 3. TRỪ KHO ẢO TRONG CACHE ĐỂ GIAO DIỆN NHẢY SỐ NGAY
        if (item.Loai_DV !== "DỊCH VỤ") {
            item.Ton_Kho = (Number(item.Ton_Kho) || 0) - qty;
        }

        // 4. RESET FORM & CẬP NHẬT GIAO DIỆN
        document.getElementById('service-search-input').value = '';
        document.getElementById('add-service-id').value = '';
        document.getElementById('add-service-qty').value = '1';
        document.getElementById('add-service-box').classList.add('hidden');
        
        // Vẽ lại danh sách dịch vụ (để thấy tồn kho giảm ảo) và chi tiết sân
        if (typeof app.renderPosProducts === 'function') app.renderPosProducts(); 
        app.showDetail(courtId); 

        console.log("✅ Thêm món thành công (Đã trừ kho ảo)");

    } catch (e) { 
        console.error("Lỗi addServiceToCourt:", e);
        alert("Lỗi: " + e.message); 
    }
},

    // --- BỔ SUNG: Đổi sân ---
    transferCourt: async () => {
    const targetId = document.getElementById('transfer-to-court-id').value;
    const oldId = window.selectedCourtId;
    if (!targetId) return alert("Vui lòng chọn sân trống!");

    const oldData = window.dataCache.courts[oldId];
    if (confirm(`Chuyển dữ liệu từ ${oldData.Ten_San} sang sân mới?`)) {
        try {
            const updates = {};
            // Chép dữ liệu
            updates[`courts/${targetId}/Trang_Thai`] = "Đang chơi";
            updates[`courts/${targetId}/Ten_Khach`] = oldData.Ten_Khach || "";
            updates[`courts/${targetId}/Gio_Vao`] = oldData.Gio_Vao || "";
            updates[`courts/${targetId}/Da_Coc`] = oldData.Da_Coc || 0;
            updates[`courts/${targetId}/Playing`] = oldData.Playing || null;
            updates[`courts/${targetId}/Dich_Vu`] = oldData.Dich_Vu || null;

            // Xóa sân cũ
            updates[`courts/${oldId}/Trang_Thai`] = "Sẵn sàng";
            updates[`courts/${oldId}/Ten_Khach`] = "";
            updates[`courts/${oldId}/Gio_Vao`] = "";
            updates[`courts/${oldId}/Da_Coc`] = 0;
            updates[`courts/${oldId}/Playing`] = null;
            updates[`courts/${oldId}/Dich_Vu`] = null;

            await window.update(window.ref(window.db), updates);
            window.ui.closeModal('court-detail');
            alert("✅ Đổi sân thành công!");
        } catch (e) { alert(e.message); }
    }
},

cancelCourtRequest: async () => {
    const id = window.selectedCourtId;
    if (confirm("Xác nhận HỦY sân này? (Xóa mọi dữ liệu khách đang chơi)")) {
        try {
            await window.update(window.ref(window.db, `courts/${id}`), {
                Trang_Thai: "Sẵn sàng", Ten_Khach: "", Gio_Vao: "", Da_Coc: 0, Playing: null, Dich_Vu: null
            });
            window.ui.closeModal('court-detail');
            alert("🗑️ Đã hủy sân!");
        } catch (e) { alert(e.message); }
    }
},
    // --- BỔ SUNG: Hủy sân đang chơi ---
    cancelCourtRequest: async () => {
        const courtId = window.selectedCourtId;
        if (confirm("Xác nhận hủy sân này? (Không tính tiền, không lưu bill)")) {
            try {
                await window.update(window.ref(window.db, `courts/${courtId}`), {
                    Trang_Thai: "Sẵn sàng",
                    Ten_Khach: "", Gio_Vao: "", Dich_Vu: null, Da_Coc: 0
                });
                window.ui.closeModal('court-detail');
            } catch (e) { alert(e.message); }
        }
    },

    confirmPayment: async () => {
    try {
        // 1. Lấy ID sân an toàn
        const inputId = window.selectedCourtId || window.currentCourtId || document.getElementById('current-checkout-id')?.value;
        if (!inputId) return alert("❌ Lỗi: Không lấy được ID thanh toán!");

        const snapshot = await window.get(window.ref(window.db, 'courts/' + inputId));
        const court = snapshot.val();
        if (!court) return alert("❌ Lỗi: Không tìm thấy dữ liệu sân!");

        const total = parseInt(document.getElementById('temp-bill-total')?.value || 0);
        const method = document.getElementById('payment-method-select')?.value.trim() || 'Tiền mặt';
        const khachHang = court.Ten_Khach || "Khách lẻ";
        const tienCoc = Number(court.Da_Coc || 0);
        const memberId = court.Member_ID;

        // ================= XỬ LÝ TRỪ VÍ HỘI VIÊN =================
        if (method === "Ví hội viên") {
            if (!memberId) {
                return alert("⚠️ Sân này không gắn với hội viên, không thể thanh toán bằng ví!");
            }
            const memberRef = window.ref(window.db, `members/${memberId}/Vi_Du`);
            const result = await window.runTransaction(memberRef, (currentBalance) => {
                const balance = Number(currentBalance || 0);
                if (balance < total) return; 
                return balance - total;
            });
            if (!result.committed) {
                return alert("❌ Số dư ví không đủ để thực hiện thanh toán!");
            }
        }

        // 2. XỬ LÝ DANH SÁCH MÓN & CHUẨN BỊ CHỐT KHO
        let billItems = [];
        let totalDichVu = 0;
        let dsTenDV = [];
        const stockUpdates = {}; // Đối tượng chứa các thay đổi tồn kho thực tế

        let rawServices = (court.Playing && court.Playing.Services) ? court.Playing.Services : (court.Dich_Vu || {});
        if (typeof rawServices !== 'object' || rawServices === null || Array.isArray(rawServices)) {
            rawServices = {}; 
        }

        Object.entries(rawServices).forEach(([sid, item]) => {
            if (item && typeof item === 'object') {
                const gia = parseInt(item.Price || item.Gia || 0);
                const sl = parseInt(item.Qty || item.So_Luong || item.SL || 1);
                const ten = item.Name || item.Ten_Mon || item.Ten || "Dịch vụ";
                
                totalDichVu += gia * sl;
                dsTenDV.push(`${ten} x${sl}`);
                billItems.push({ Ten: ten, SL: sl, Gia: gia, name: ten, qty: sl, price: gia });

                // --- LOGIC CHỐT KHO THẬT ---
                const serviceInCache = window.dataCache.services[sid];
                // Chỉ chốt kho cho Hàng hóa (nước uống, thuốc lá...), bỏ qua loại DỊCH VỤ
                if (serviceInCache && serviceInCache.Loai_DV !== "DỊCH VỤ") {
                    stockUpdates[`services/${sid}/Ton_Kho`] = Number(serviceInCache.Ton_Kho);
                }
            }
        });

        // 3. XỬ LÝ TIỀN SÂN KÈM THỜI GIAN
        const gioVao = court.Gio_Vao || "??:??";
        const gioRa = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const tienSan = total + tienCoc - totalDichVu; 
        const tenSanHienThi = `Tiền giờ ${court.Ten_San || inputId} (${gioVao} - ${gioRa})`;
        
        if (tienSan > 0) {
            billItems.unshift({ Ten: tenSanHienThi, SL: 1, Gia: tienSan, name: tenSanHienThi, qty: 1, price: tienSan });
        }
        if (tienCoc > 0) {
            billItems.push({ Ten: "Đã khấu trừ tiền cọc", SL: 1, Gia: -tienCoc, name: "Đã khấu trừ tiền cọc", qty: 1, price: -tienCoc });
        }
        let noiDungFull = tenSanHienThi + (dsTenDV.length > 0 ? ", " + dsTenDV.join(", ") : "");

        // 4. THỰC THI CẬP NHẬT TỔNG THỂ (Atomic Updates)
        const finalUpdates = {};
        const billId = Date.now();

        // A. Cập nhật hóa đơn
        finalUpdates[`bills/${billId}`] = {
            Thoi_Gian: new Date().toLocaleString('vi-VN'),
            Ngay_Thang: new Date().toISOString().split('T')[0],
            Khach_Hang: khachHang,
            Member_ID: memberId || null,
            Tong_Tien: total,
            PTTT: method,
            Items: billItems,
            Noi_Dung: noiDungFull,
            Ten_San: court.Ten_San || "",
            Gio_Vao: gioVao,
            Gio_Ra: gioRa
        };

        // B. Reset sân về trạng thái trống
        finalUpdates[`courts/${inputId}`] = {
            Trang_Thai: "Sẵn sàng", Ten_Khach: "", SDT: "", Sdt_Khach: "", Member_ID: null, Gio_Vao: "", Da_Coc: 0, Playing: null, Dich_Vu: null 
        };

        // C. Gộp phần chốt kho vào cùng một lệnh update để tối ưu
        Object.assign(finalUpdates, stockUpdates);

        await window.update(window.ref(window.db), finalUpdates);

        // 5. CẬP NHẬT TỔNG CHI TIÊU HỘI VIÊN (Tích lũy thăng hạng)
        if (memberId) {
            const mDataRef = window.ref(window.db, `members/${memberId}`);
            await window.runTransaction(mDataRef, (current) => {
                if (current) {
                    current.Tong_Chi_Tieu = (Number(current.Tong_Chi_Tieu) || 0) + total;
                }
                return current;
            });
        }

        // 6. DỌN DẸP GIAO DIỆN & IN ẤN
        if (typeof ui !== 'undefined' && ui.closeModal) ui.closeModal('checkout');
        if (typeof ui !== 'undefined' && ui.closeModal) ui.closeModal('court-detail');

        setTimeout(() => {
            if (confirm("✅ Thanh toán & Chốt kho thành công! In hóa đơn chứ?")) {
                if (typeof window.handlePrintOrder === 'function') {
                    window.handlePrintOrder({
                        Id: billId.toString().slice(-8),
                        Items: billItems.map(i => ({ name: i.Ten, qty: i.SL, price: i.Gia })), 
                        Total: total,
                        Customer: khachHang
                    });
                }
            }
        }, 400);

    } catch (error) {
        console.error("Lỗi thanh toán:", error);
        alert("Lỗi: " + error.message);
    }
},
// --- HÀM VẼ GIỎ HÀNG BÊN PHẢI TAB BÁN LẺ ---
    renderPOSCart: () => {
    // Đổi ID từ 'pos-cart-items' sang 'pos-cart-render' cho khớp với <tbody> trong index.html
    const container = document.getElementById('pos-cart-render');
    const totalLabel = document.getElementById('pos-total');
    
    if (!container) return;

    let html = '';
    let total = 0;

    // Kiểm tra giỏ hàng trống
    if (!window.posCart || window.posCart.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="4" class="py-16 text-center">
                    <div class="opacity-20">
                        <i class="fa-solid fa-cart-shopping text-4xl mb-3"></i>
                        <p class="text-[10px] font-black uppercase tracking-[0.2em]">Giỏ hàng trống</p>
                    </div>
                </td>
            </tr>`;
        if (totalLabel) totalLabel.innerText = '0đ';
        return;
    }

    // Duyệt qua giỏ hàng để tạo các dòng bảng (tr)
    window.posCart.forEach((item, index) => {
        const itemPrice = Number(item.price || 0);
        const itemQty = Number(item.qty || 0);
        const subtotal = itemPrice * itemQty;
        total += subtotal;

        html += `
            <tr class="border-b border-white/5 group hover:bg-white/[0.03] transition-all">
                <td class="py-3 pl-2">
                    <div class="text-[10px] font-black text-white uppercase leading-tight truncate max-w-[110px]" title="${item.name}">
                        ${item.name}
                    </div>
                    <div class="text-[9px] font-bold text-slate-500">${itemPrice.toLocaleString()}đ</div>
                </td>

                <td class="py-3">
                    <div class="flex items-center justify-center gap-1.5 bg-black/40 rounded-lg p-1 w-fit mx-auto border border-white/5">
                        <button onclick="app.updatePOSQty(${index}, -1)" 
                                class="w-5 h-5 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                            <i class="fa-solid fa-minus text-[7px]"></i>
                        </button>
                        
                        <span class="text-[10px] font-[900] text-blue-400 w-4 text-center tabular-nums">${itemQty}</span>
                        
                        <button onclick="app.updatePOSQty(${index}, 1)" 
                                class="w-5 h-5 flex items-center justify-center bg-blue-600 rounded-md text-white hover:bg-blue-500 transition-all shadow-sm">
                            <i class="fa-solid fa-plus text-[7px]"></i>
                        </button>
                    </div>
                </td>

                <td class="py-3 text-right pr-2 font-black text-white text-[10px] tabular-nums">
                    ${subtotal.toLocaleString()}đ
                </td>

                <td class="py-3 text-center w-8">
                    <button onclick="app.updatePOSQty(${index}, -999)" 
                            class="text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                        <i class="fa-solid fa-trash-can text-[9px]"></i>
                    </button>
                </td>
            </tr>`;
    });

    container.innerHTML = html;
    
    // Cập nhật tổng tiền
    if (totalLabel) {
        totalLabel.innerText = total.toLocaleString() + 'đ';
        totalLabel.className = "font-black text-2xl text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.4)]";
    }
},

    // --- HÀM CẬP NHẬT SỐ LƯỢNG TRONG GIỎ POS ---
    updatePOSQty: (index, change) => {
    const item = window.posCart[index];
    if (!item) return;

    const product = window.dataCache.services[item.id];
    const isDichVu = product && product.Loai_DV === "DỊCH VỤ";

    // 1. XÓA MÓN HOÀN TOÀN (-999)
    if (change === -999) {
        if (!isDichVu && product) {
            // Cộng trả lại toàn bộ số lượng từ giỏ hàng vào Cache
            product.Ton_Kho = Number(product.Ton_Kho || 0) + Number(item.qty);
        }
        window.posCart.splice(index, 1);
    } 
    
    // 2. GIẢM SỐ LƯỢNG (-1)
    else if (change === -1) {
        if (item.qty > 1) {
            item.qty--;
            if (!isDichVu && product) {
                // Trả lại 1 đơn vị vào Cache
                product.Ton_Kho = Number(product.Ton_Kho || 0) + 1;
            }
        } else {
            // Nếu giảm từ 1 về 0 thì xóa món và trả kho
            if (!isDichVu && product) {
                product.Ton_Kho = Number(product.Ton_Kho || 0) + 1;
            }
            window.posCart.splice(index, 1);
        }
    }

    // 3. TĂNG SỐ LƯỢNG (+1)
    else if (change === 1) {
        if (!isDichVu && product) {
            // Kiểm tra tồn kho trong Cache trước khi cho tăng
            if (Number(product.Ton_Kho) > 0) {
                item.qty++;
                product.Ton_Kho = Number(product.Ton_Kho) - 1; // Trừ kho ảo trong Cache
            } else {
                alert("Sản phẩm này đã hết hàng trong kho!");
                return;
            }
        } else {
            // Nếu là DỊCH VỤ (không cần kho) thì tăng thoải mái
            item.qty++;
        }
    }

    // 4. CẬP NHẬT GIAO DIỆN CẢ 2 VÙNG (Local update)
    app.renderPOSCart();     // Vẽ lại bảng giỏ hàng
    app.renderPosProducts(); // Vẽ lại danh sách sản phẩm (để cập nhật số Tồn hiển thị)
},
searchMemberForPOS: (val) => {
    const input = val.trim().toLowerCase();
    const resultsDiv = document.getElementById('pos-member-results');
    const memberIdInput = document.getElementById('pos-member-id');
    const resetBtn = document.getElementById('btn-reset-pos-cust');
    const members = window.dataCache?.members;

    if (!resultsDiv || !members) return;

    // Hiển thị/Ẩn nút xóa nhanh nội dung
    if (resetBtn) {
        val.length > 0 ? resetBtn.classList.remove('hidden') : resetBtn.classList.add('hidden');
    }

    if (input.length < 1) {
        resultsDiv.classList.add('hidden');
        memberIdInput.value = '';
        return;
    }

    let html = '';
    let hasMatch = false;

    Object.entries(members).forEach(([id, m]) => {
        const ten = m.Ten_HV || "";
        const sdt = m.SDT || "";
        if (ten.toLowerCase().includes(input) || sdt.includes(input)) {
            hasMatch = true;
            html += `
                <div onclick="app.selectMemberForPOS('${id}', '${ten}')" 
                     class="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-all">
                    <div class="font-black text-blue-600">${ten}</div>
                    <div class="text-[10px] text-slate-500 font-bold uppercase italic">
                        SĐT: ${sdt} — Hạng: ${m.Hang_HV || 'Đồng'}
                    </div>
                </div>`;
        }
    });

    if (hasMatch) {
        resultsDiv.innerHTML = html;
        resultsDiv.classList.remove('hidden');
    } else {
        resultsDiv.classList.add('hidden');
        memberIdInput.value = ''; 
    }
},
selectMemberForPOS: (id, name) => {
    const searchInput = document.getElementById('pos-customer-search');
    const idInput = document.getElementById('pos-member-id');
    const resultsDiv = document.getElementById('pos-member-results');

    if (searchInput) {
        searchInput.value = name;
        // Đổi màu chữ để báo hiệu đã chọn thành công hội viên từ danh sách
        searchInput.classList.add('text-blue-500', 'font-black'); 
    }
    if (idInput) idInput.value = id;
    
    // Ẩn danh sách gợi ý ngay sau khi chọn
    if (resultsDiv) resultsDiv.classList.add('hidden');

    console.log("✅ Đã chọn hội viên POS thành công:", name);
},
// 1. Hàm tính toán lại mọi con số khi thay đổi số tiền
recalculatePosFinal: () => {
    // Lấy các giá trị đầu vào
    const subtotal = Number(document.getElementById('pos-calc-subtotal').getAttribute('data-value') || 0);
    const rankPercent = Number(document.getElementById('pos-rank-discount-percent').innerText || 0);
    const manualDisc = Number(document.getElementById('pos-manual-discount').value || 0);
    const cashReceived = Number(document.getElementById('pos-cash-received').value || 0);

    // Tính tiền giảm theo hạng
    const rankDiscMoney = Math.round(subtotal * rankPercent / 100);
    
    // Tính tổng thanh toán cuối cùng
    const finalTotal = Math.max(0, subtotal - rankDiscMoney - manualDisc);
    
    // Hiển thị tổng mới
    document.getElementById('pos-display-total').innerText = finalTotal.toLocaleString() + 'đ';
    document.getElementById('pos-display-total').setAttribute('data-final', finalTotal);

    // Tính tiền thối lại
    const change = Math.max(0, cashReceived - finalTotal);
    document.getElementById('pos-cash-change').innerText = cashReceived > 0 ? change.toLocaleString() + 'đ' : '0đ';
    
    // Hiệu ứng cảnh báo nếu khách đưa thiếu tiền mặt
    if (cashReceived > 0 && cashReceived < finalTotal && document.getElementById('pos-method-select').value === "Tiền mặt") {
        document.getElementById('pos-cash-change').className = "text-sm font-bold text-rose-500 italic";
        document.getElementById('pos-cash-change').innerText = "Đưa thiếu: " + (finalTotal - cashReceived).toLocaleString() + "đ";
    } else {
        document.getElementById('pos-cash-change').className = "text-lg font-black text-orange-600";
    }
},

// 2. Hàm khi mở Modal (checkoutPos) - Cập nhật dữ liệu ban đầu
checkoutPos: async () => {
    if (!window.posCart || window.posCart.length === 0) return alert("🛒 Giỏ hàng trống!");

    const memberId = document.getElementById('pos-member-id')?.value;
    const customerName = document.getElementById('pos-customer-search')?.value || "Khách lẻ";
    const subtotal = window.posCart.reduce((s, i) => s + (i.price * i.qty), 0);

    // Lấy % giảm giá dựa trên hạng hội viên
    let discountPercent = 0;
    let rankName = "Đồng";
    if (memberId && window.dataCache.members[memberId]) {
        const member = window.dataCache.members[memberId];
        rankName = member.Hang_HV || 'Đồng';
        const conf = window.dataCache.config || {};
        const rankKey = rankName === 'Vàng' ? 'mGold' : rankName === 'Bạc' ? 'mSilver' : 'mCopper';
        discountPercent = Number(conf[rankKey] || 0);
    }

    // Đổ dữ liệu vào Modal
    document.getElementById('pos-display-name').innerText = "Khách: " + customerName;
    document.getElementById('pos-calc-subtotal').innerText = subtotal.toLocaleString() + 'đ';
    document.getElementById('pos-calc-subtotal').setAttribute('data-value', subtotal);
    document.getElementById('pos-rank-name').innerText = "Hạng: " + rankName;
    document.getElementById('pos-rank-discount-percent').innerText = discountPercent;
    document.getElementById('pos-manual-discount').value = 0;
    document.getElementById('pos-cash-received').value = "";
    
    // Reset phương thức về Tiền mặt
    document.getElementById('pos-method-select').value = "Tiền mặt";
    document.getElementById('pos-cash-area').classList.remove('hidden');
    document.getElementById('pos-wallet-view').classList.add('hidden');

    // Hiện modal
    document.getElementById('modal-pos-checkout').classList.remove('hidden');
    document.getElementById('modal-pos-checkout').style.display = 'flex';

    // Tính toán phát đầu tiên
    app.recalculatePosFinal();

    // Gán nút xác nhận
    document.getElementById('btn-pos-final').onclick = () => app.processFinalPos(subtotal, discountPercent, customerName, memberId);
},

// 3. Xử lý ẩn hiện phần tiền khách đưa khi chọn phương thức
handlePosMethodChange: () => {
    const method = document.getElementById('pos-method-select').value;
    const cashArea = document.getElementById('pos-cash-area');
    const walletView = document.getElementById('pos-wallet-view');
    const memberId = document.getElementById('pos-member-id')?.value;

    // Ẩn/Hiện tiền mặt
    cashArea.classList.toggle('hidden', method !== "Tiền mặt");
    
    // Xử lý Ví hội viên
    if (method === "Ví hội viên") {
        if (!memberId) {
            alert("Chỉ hội viên mới có ví!");
            document.getElementById('pos-method-select').value = "Tiền mặt";
            cashArea.classList.remove('hidden');
            return;
        }
        const member = window.dataCache.members[memberId];
        document.getElementById('pos-wallet-balance').innerText = Number(member.Vi_Du || 0).toLocaleString() + 'đ';
        walletView.classList.remove('hidden');
    } else {
        walletView.classList.add('hidden');
    }
},
processFinalPos: async (subtotal, rankDiscPercent, customerName, memberId) => {
    try {
        const method = document.getElementById('pos-method-select').value;
        const manualDisc = Number(document.getElementById('pos-manual-discount')?.value || 0);
        
        const rankDiscMoney = Math.round(subtotal * rankDiscPercent / 100);
        const totalAmount = Math.max(0, subtotal - rankDiscMoney - manualDisc);

        const updates = {}; // Dùng để gom tất cả các thay đổi gửi lên Firebase 1 lần
        const now = new Date();
        const bId = 'BILL-POS-' + Date.now();

        // 1. XỬ LÝ VÍ HỘI VIÊN (Dùng Transaction riêng nếu cần, hoặc trừ thẳng nếu tin tưởng Cache)
        if (method === "Ví hội viên") {
            if (!memberId) return alert("Lỗi: Không tìm thấy thông tin hội viên!");
            const member = window.dataCache.members[memberId];
            const currentBalance = Number(member.Vi_Du || 0);
            
            if (currentBalance < totalAmount) return alert("❌ Số dư ví không đủ!");
            
            // Trừ tiền trong ví
            updates[`members/${memberId}/Vi_Du`] = currentBalance - totalAmount;
        }

        // 2. CẬP NHẬT TỒN KHO THẬT SỰ (Lấy từ dataCache đã trừ ảo trước đó)
        window.posCart.forEach(item => {
            const product = window.dataCache.services[item.id];
            if (product && product.Loai_DV !== "DỊCH VỤ") {
                // Ghi đè số lượng tồn kho cuối cùng lên Firebase
                updates[`services/${item.id}/Ton_Kho`] = Number(product.Ton_Kho);
            }
        });

        // 3. CẬP NHẬT TỔNG CHI TIÊU & HẠNG (Nếu có Member)
        if (memberId) {
            const member = window.dataCache.members[memberId];
            const newTotalSpend = (Number(member.Tong_Chi_Tieu) || 0) + totalAmount;
            updates[`members/${memberId}/Tong_Chi_Tieu`] = newTotalSpend;

            // Logic thăng hạng
            let newRank = member.Hang_HV || "Đồng";
            if (newTotalSpend >= 15000000) newRank = "Vàng";
            else if (newTotalSpend >= 5000000) newRank = "Bạc";
            updates[`members/${memberId}/Hang_HV`] = newRank;
        }

        // 4. CHUẨN BỊ DỮ LIỆU HÓA ĐƠN
        updates[`bills/${bId}`] = {
            Khach_Hang: customerName,
            Member_ID: memberId || null,
            Tong_Tien: totalAmount,
            Tong_Goc: subtotal,
            Giam_Gia_Rank: rankDiscMoney,
            Giam_Gia_Mat: manualDisc,
            PTTT: method,
            Noi_Dung: (method === "Ví hội viên" ? "[VÍ] " : "") + "Bán lẻ: " + window.posCart.map(i => i.name).join(', '),
            Items: window.posCart.map(i => ({ 
                Ten: i.name, 
                SL: i.qty, 
                Gia: i.price 
            })),
            Thoi_Gian: now.toLocaleString('vi-VN'),
            Ngay_Thang: now.toISOString().split('T')[0],
            Loai_HD: "Bán lẻ"
        };

        // 🚀 THỰC THI GHI DỮ LIỆU TỔNG THỂ (Atomic Update - Cực kỳ an toàn)
        await window.update(window.ref(window.db), updates);

        // 5. RESET GIAO DIỆN
        window.posCart = [];
        app.renderPOSCart();
        app.renderPosProducts(); // Vẽ lại sản phẩm để cập nhật tồn kho chính thức

        const modal = document.getElementById('modal-pos-checkout');
        if (modal) modal.style.display = 'none'; // Đóng bằng style vì bạn dùng flex
        
        const searchInput = document.getElementById('pos-customer-search');
        if (searchInput) {
            searchInput.value = "";
            searchInput.classList.remove('text-blue-500', 'font-black');
        }
        
        alert(`✅ Thanh toán thành công bằng ${method}!`);

    } catch (e) { 
        console.error("Lỗi processFinalPos:", e);
        alert("Lỗi hệ thống: " + e.message); 
    }
},
// Thêm hàm này vào bên trong window.app = { ... }
confirmRecharge: async () => {
    const mId = document.getElementById('recharge-member-id').value;
    const amount = parseInt(document.getElementById('recharge-amount').value);
    const method = document.getElementById('recharge-method').value;

    if (!mId || !amount || amount <= 0) {
        alert("Vui lòng nhập số tiền hợp lệ!");
        return;
    }

    try {
        // 1. Cập nhật số dư ví trong database (Trường Vi_Du)
        const memberRef = window.ref(window.db, `members/${mId}/Vi_Du`);
        await window.runTransaction(memberRef, (current) => {
            return (Number(current) || 0) + amount;
        });

        // 2. Ghi nhận hóa đơn nạp tiền để theo dõi doanh thu
        const now = new Date();
        const bId = 'BILL-RECH-' + Date.now();
        await window.set(window.ref(window.db, 'bills/' + bId), {
            Khach_Hang: document.getElementById('recharge-member-name').innerText.replace('Hội viên: ', ''),
            Tong_Tien: amount,
            PTTT: method,
            Noi_Dung: `Nạp tiền vào ví hội viên`,
            Thoi_Gian: now.toLocaleString('vi-VN'),
            Ngay_Thang: now.toISOString().split('T')[0],
            Loai_HD: "Nạp tiền",
            Member_ID: mId
        });

        alert(`✅ Đã nạp thành công ${amount.toLocaleString()}đ vào ví!`);
        ui.closeModal('recharge');
        
        // Reset form
        document.getElementById('recharge-amount').value = "";
    } catch (e) {
        console.error("Lỗi nạp tiền:", e);
        alert("Lỗi: " + e.message);
    }
},

saveMember: async () => {
    // 1. Lấy dữ liệu từ các ID trong Modal Hội viên
    const id = document.getElementById('member-id').value; // ID ẩn dùng khi sửa
    const name = document.getElementById('m-name').value.trim();
    const phone = document.getElementById('m-phone').value.trim();
    const wallet = Number(document.getElementById('m-wallet').value || 0);
    const rank = document.getElementById('m-rank')?.value || "Đồng";

    // 2. Kiểm tra bắt buộc
    if (!name || !phone) {
        return alert("⚠️ Vui lòng nhập đầy đủ Tên và Số điện thoại!");
    }

    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        // 3. Chuẩn bị đối tượng dữ liệu
        const memberData = {
            Ten_HV: name,
            SDT: phone,
            Vi_Du: wallet,
            Hang_HV: rank,
            Ngay_Cap_Nhat: now.toLocaleString('vi-VN')
        };

        if (id) {
            // TRƯỜNG HỢP CHỈNH SỬA: Cập nhật dựa trên ID có sẵn
            await window.update(window.ref(window.db, `members/${id}`), memberData);
            alert("✅ Đã cập nhật thông tin hội viên!");
        } else {
            // TRƯỜNG HỢP THÊM MỚI: Dùng push để Firebase tự tạo ID duy nhất
            const newListRef = window.push(window.ref(window.db, 'members'));
            await window.set(newListRef, {
                ...memberData,
                Ngay_Tham_Gia: dateStr,
                Tong_Chi_Tieu: 0 // Khởi tạo chi tiêu ban đầu
            });
            alert("✅ Đã thêm hội viên mới thành công!");
        }

        // 4. Dọn dẹp giao diện sau khi lưu
        document.getElementById('member-id').value = "";
        document.getElementById('m-name').value = "";
        document.getElementById('m-phone').value = "";
        document.getElementById('m-wallet').value = "0";
        
        if (window.ui && window.ui.closeModal) {
            window.ui.closeModal('member');
        }

    } catch (e) {
        console.error("Lỗi khi lưu hội viên:", e);
        alert("❌ Lỗi: " + e.message);
    }
},

editMember: (id) => {
    const m = window.dataCache.members[id];
    if (!m) return;

    // Đổ dữ liệu vào các ô Input trong Modal
    document.getElementById('member-id').value = id;
    document.getElementById('m-name').value = m.Ten_HV || "";
    document.getElementById('m-phone').value = m.SDT || "";
    document.getElementById('m-wallet').value = m.Vi_Du || 0;
    
    if (document.getElementById('m-rank')) {
        document.getElementById('m-rank').value = m.Hang_HV || "Đồng";
    }

    // Mở modal
    window.ui.openModal('member');
},
renderStockTable: () => {
    const container = document.getElementById('list-stocks-table');
    if (!container) return;

    // 1. Lấy dữ liệu từ cache và sắp xếp mới nhất lên đầu
    const stocks = window.dataCache.stocks || {};
    const stockList = Object.entries(stocks).sort((a, b) => b[1].timestamp - a[1].timestamp);

    let html = '';
    stockList.forEach(([id, data]) => {
        // Xử lý hiển thị thông tin sản phẩm và số lượng
        const itemsPreview = data.items ? data.items.map(i => i.name).join(', ') : data.productName;
        const totalQty = data.items ? data.items.reduce((sum, i) => sum + i.qty, 0) : data.qty;
        
        // Xác định màu sắc cho trạng thái thanh toán
        const isPaid = data.status === "Đã thanh toán";
        const statusClass = isPaid ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600";

        html += `
            <tr class="group hover:bg-slate-50 transition-all">
                <td class="px-5 py-4 border-y border-slate-50 rounded-l-2xl">
                    <div class="text-[11px] font-bold text-slate-400 italic">${data.date || '---'}</div>
                    <div class="text-xs font-black text-slate-700">${data.time || '---'}</div>
                </td>

                <td class="px-5 py-4 border-y border-slate-50">
                    <div class="text-[10px] font-black uppercase text-indigo-400 mb-1">${data.supplierName || 'N/A'}</div>
                    <div class="text-sm font-bold text-slate-700 line-clamp-1">${itemsPreview || 'N/A'}</div>
                    <div class="text-[9px] font-bold text-slate-300">Mã: ${id.slice(-6).toUpperCase()}</div>
                </td>

                <td class="px-5 py-4 border-y border-slate-50 text-center">
                    <span class="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-black text-xs">
                        ${totalQty}
                    </span>
                </td>

                <td class="px-5 py-4 border-y border-slate-50 text-right">
                    <div class="text-sm font-black text-slate-800">${Number(data.total || 0).toLocaleString()}đ</div>
                    ${data.vatPercent > 0 ? `<div class="text-[9px] font-bold text-emerald-500 italic">VAT: ${data.vatPercent}%</div>` : ''}
                </td>

                <td class="px-5 py-4 border-y border-slate-50 text-center">
                    <span class="text-[9px] font-[900] uppercase px-2 py-1.5 rounded-md tracking-widest ${statusClass}">
                        ${data.status || 'Thành công'}
                    </span>
                    <div class="text-[8px] font-bold text-slate-300 mt-1 uppercase">${data.method || ''}</div>
                </td>

                <td class="px-5 py-4 border-y border-slate-50 rounded-r-2xl text-right">
                    <div class="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button onclick="app.editStock('${id}')" class="text-blue-500 hover:scale-110 transition-transform">
                            <i class="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button onclick="app.deleteStock('${id}')" class="text-slate-300 hover:text-rose-500 hover:scale-110 transition-transform">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    container.innerHTML = html || `
        <tr>
            <td colspan="6" class="py-20 text-center opacity-20 flex flex-col items-center">
                <i class="fa-solid fa-box-open text-4xl mb-3"></i>
                <p class="text-[10px] font-black uppercase tracking-widest">Không tìm thấy dữ liệu nhập kho</p>
            </td>
        </tr>`;
},
// --- QUẢN LÝ NHẬP KHO ---
    
    // 1. Khởi tạo dữ liệu khi mở Modal Nhập kho
    initStockModal: () => {
    window.stkItems = []; // Reset danh sách món
    const editIdEl = document.getElementById('stock-edit-id');
    if (editIdEl) editIdEl.value = ""; // Reset ID sửa

    // Xóa trắng các ô nhập tìm kiếm sản phẩm nhanh
    const fields = ['stk-product-search', 'stk-product-id', 'stk-qty', 'stk-price', 'stk-vat'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (id === 'stk-vat' ? 0 : "");
    });

    if (app.renderSuppliers) app.renderSuppliers();
    app.renderStockItemsList();
    app.calculateStockTotal();
},

    // 2. Lưu phiếu nhập kho và cập nhật số lượng tồn kho
  calculateStockTotal: () => {
    const subtotalEl = document.getElementById('stk-subtotal');
    const finalTotalEl = document.getElementById('stk-final-total');
    const itemCountEl = document.getElementById('stk-item-count');
    const vatInput = document.getElementById('stk-vat');

    // Kiểm tra an toàn để không bị lỗi null
    if (!subtotalEl || !finalTotalEl) return;

    // Tính tổng từ danh sách món trong mảng stkItems
    const subtotal = (window.stkItems || []).reduce((sum, item) => sum + (item.total || 0), 0);
    const vatPercent = Number(vatInput?.value || 0);
    const finalTotal = subtotal + Math.round(subtotal * vatPercent / 100);

    // Hiển thị lên giao diện
    subtotalEl.innerText = subtotal.toLocaleString() + 'đ';
    finalTotalEl.innerText = finalTotal.toLocaleString() + 'đ';
    finalTotalEl.setAttribute('data-value', finalTotal);
    
    if (itemCountEl) itemCountEl.innerText = (window.stkItems || []).length;
},
// B. Hàm lưu phiếu nhập kho
saveStock: async () => {
    // 1. Kiểm tra các phần tử giao diện thiết yếu
    const supEl = document.getElementById('stk-supplier-id');
    const statusEl = document.getElementById('stk-status');
    const finalTotalEl = document.getElementById('stk-final-total');
    const editIdEl = document.getElementById('stock-edit-id');
    const vatEl = document.getElementById('stk-vat');

    // Chặn lỗi "null" ngay lập tức nếu thiếu thẻ HTML
    if (!supEl || !statusEl || !finalTotalEl) {
        return alert("❌ Lỗi hệ thống: Không tìm thấy các trường nhập liệu!");
    }

    const supId = supEl.value;
    const status = statusEl.value;
    const finalTotal = Number(finalTotalEl.getAttribute('data-value') || 0);
    const editId = editIdEl ? editIdEl.value : "";
    const vatPercent = Number(vatEl?.value || 0);

    // 2. Kiểm tra dữ liệu đầu vào thực tế
    if (!supId) return alert("⚠️ Vui lòng chọn Nhà cung cấp!");
    if (!window.stkItems || window.stkItems.length === 0) {
        return alert("⚠️ Vui lòng thêm ít nhất 1 sản phẩm vào bảng!");
    }

    try {
        const now = new Date();
        const billId = editId || 'STK-' + Date.now();

        // --- BƯỚC 1: XỬ LÝ HOÀN TÁC NẾU LÀ CHẾ ĐỘ SỬA (UNDO) ---
        if (editId && window.dataCache.stocks[editId]) {
            const old = window.dataCache.stocks[editId];
            
            // a. Hoàn tác tồn kho của danh sách món cũ
            if (old.items && Array.isArray(old.items)) {
                for (const item of old.items) {
                    const oldServiceRef = window.ref(window.db, `services/${item.productId}/Ton_Kho`);
                    await window.runTransaction(oldServiceRef, (cur) => (Number(cur) || 0) - item.qty);
                }
            }
            
            // b. Hoàn tác Tổng nhập và Công nợ cho Nhà cung cấp cũ
            const oldSupplierRef = window.ref(window.db, `suppliers/${old.supplierId}`);
            await window.runTransaction(oldSupplierRef, (cur) => {
                if (cur) {
                    cur.Tong_Nhap = (Number(cur.Tong_Nhap) || 0) - old.total;
                    if (old.status === "Chưa thanh toán") {
                        cur.Cong_No = (Number(cur.Cong_No) || 0) - old.total;
                    }
                }
                return cur;
            });
        }

        // --- BƯỚC 2: CHUẨN BỊ DỮ LIỆU MỚI ---
        const stockData = {
            supplierId: supId,
            supplierName: window.dataCache.suppliers[supId]?.Ten_NCC || "N/A",
            items: window.stkItems, // Lưu toàn bộ mảng sản phẩm
            total: finalTotal,
            vatPercent: vatPercent,
            status: status,
            date: now.toLocaleDateString('vi-VN'),
            time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            timestamp: now.getTime()
        };

        // --- BƯỚC 3: CẬP NHẬT LÊN DATABASE ---
        
        // 1. Lưu/Ghi đè phiếu nhập
        await window.set(window.ref(window.db, `stocks/${billId}`), stockData);

        // 2. Cập nhật tồn kho cho TỪNG sản phẩm trong danh sách mới
        for (const item of window.stkItems) {
            const serviceRef = window.ref(window.db, `services/${item.productId}/Ton_Kho`);
            await window.runTransaction(serviceRef, (cur) => (Number(cur) || 0) + item.qty);
        }

        // 3. Cập nhật Tổng nhập & Công nợ cho Nhà cung cấp
        const supplierRef = window.ref(window.db, `suppliers/${supId}`);
        await window.runTransaction(supplierRef, (cur) => {
            if (cur) {
                cur.Tong_Nhap = (Number(cur.Tong_Nhap) || 0) + finalTotal;
                if (status === "Chưa thanh toán") {
                    cur.Cong_No = (Number(cur.Cong_No) || 0) + finalTotal;
                }
            }
            return cur;
        });

        alert(editId ? "✅ Đã cập nhật phiếu nhập thành công!" : "✅ Nhập kho thành công!");
        
        // Dọn dẹp sau khi lưu thành công
        window.stkItems = []; 
        if (editIdEl) editIdEl.value = "";
        app.renderStockItemsList(); // Vẽ lại bảng rỗng
        app.calculateStockTotal();  // Reset tiền về 0
        window.ui.closeModal('stock');

    } catch (e) { 
        console.error(e);
        alert("Lỗi: " + e.message); 
    }
},

    // 3. Xóa lịch sử nhập kho (Không trừ lại kho để tránh sai lệch kế toán)
    deleteStock: async (id) => {
        if (!confirm("Xóa lịch sử nhập này? (Lưu ý: Thao tác này không trừ lại số lượng đã cộng vào kho)")) return;
        try {
            await window.set(window.ref(window.db, `stocks/${id}`), null);
        } catch (e) { alert(e.message); }
    },

   // 1. Hàm Reset Form (Hàm đang bị báo lỗi)
    resetSupplierForm: () => {
        console.log("🧹 Đang dọn dẹp form nhà cung cấp...");
        const fields = ['supplier-edit-id', 'sup-name', 'sup-phone', 'sup-address'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
    },

    // 2. Hàm Lưu
    saveSupplier: async () => {
        const id = document.getElementById('supplier-edit-id').value;
        const name = document.getElementById('sup-name').value.trim();
        const phone = document.getElementById('sup-phone').value.trim();
        const address = document.getElementById('sup-address').value.trim();

        if (!name) return alert("⚠️ Vui lòng nhập tên nhà cung cấp!");

        try {
            const supData = {
                Ten_NCC: name,
                SDT: phone,
                Dia_Chi: address,
                Cap_Nhat: new Date().toLocaleString('vi-VN')
            };

            if (id) {
                await window.update(window.ref(window.db, `suppliers/${id}`), supData);
            } else {
                const newRef = window.push(window.ref(window.db, 'suppliers'));
                await window.set(newRef, {
                    ...supData,
                    Tong_Nhap: 0,
                    Cong_No: 0,
                    Ngay_Tao: new Date().toISOString().split('T')[0]
                });
            }

            // GỌI HÀM RESET TẠI ĐÂY
            window.app.resetSupplierForm(); 
            
            alert("✅ Lưu đối tác thành công!");
            window.ui.closeModal('supplier');
        } catch (e) {
            alert("❌ Lỗi: " + e.message);
        }
    },

    // 3. Hàm Sửa
    editSupplier: (id) => {
        const s = window.dataCache.suppliers[id];
        if (!s) return;
        
        // Điền dữ liệu vào form
        document.getElementById('supplier-edit-id').value = id;
        document.getElementById('sup-name').value = s.Ten_NCC || "";
        document.getElementById('sup-phone').value = s.SDT || "";
        document.getElementById('sup-address').value = s.Dia_Chi || "";
        
        window.ui.openModal('supplier');
    },

    // 4. Hàm Xóa
    deleteSupplier: async (id) => {
        if (!confirm("Xóa nhà cung cấp này?")) return;
        try {
            await window.set(window.ref(window.db, `suppliers/${id}`), null);
        } catch (e) { alert(e.message); }
    },
    renderSupplierTable: () => {
    const tableBody = document.getElementById('supplier-table-body');
    const totalDebtLabel = document.getElementById('total-supplier-debt');
    if (!tableBody) return;

    const search = document.getElementById('filter-supplier-search')?.value?.toLowerCase().trim() || "";
    const sups = window.dataCache.suppliers || {};
    
    let html = '';
    let totalDebt = 0;

    // Chuyển thành mảng và lọc theo từ khóa tìm kiếm
    const entries = Object.entries(sups).filter(([id, s]) => {
        if (!s || !s.Ten_NCC) return false;
        const matchSearch = !search || 
            s.Ten_NCC.toLowerCase().includes(search) || 
            (s.SDT && s.SDT.includes(search)) || 
            (s.Dia_Chi && s.Dia_Chi.toLowerCase().includes(search));
        return matchSearch;
    });

    entries.forEach(([id, s]) => {
        const debt = Number(s.Cong_No || 0);
        const totalImport = Number(s.Tong_Nhap || 0);
        totalDebt += debt;

        html += `
            <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                <td class="p-5">
                    <div class="text-slate-800 uppercase font-black">${s.Ten_NCC}</div>
                    <div class="text-[10px] text-slate-400 italic font-medium">${s.Dia_Chi || '---'}</div>
                </td>
                <td class="p-5 text-center">
                    <span class="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px]">${s.SDT || 'N/A'}</span>
                </td>
                <td class="p-5 text-right text-slate-700 font-black">${totalImport.toLocaleString()}đ</td>
                <td class="p-5 text-right text-rose-600 font-black">${debt.toLocaleString()}đ</td>
                <td class="p-5 text-right">
                    <div class="flex justify-end gap-2">
                        <button onclick="app.editSupplier('${id}')" class="text-slate-300 hover:text-blue-500 transition-colors">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="app.deleteSupplier('${id}')" class="text-slate-200 hover:text-rose-500 transition-colors">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    tableBody.innerHTML = html || '<tr><td colspan="5" class="p-10 text-center italic text-slate-400">Không tìm thấy nhà cung cấp nào</td></tr>';
    if (totalDebtLabel) totalDebtLabel.innerText = totalDebt.toLocaleString() + 'đ';
},
renderSuppliers: () => {
    // 1. Lấy ô Select trong Modal Nhập kho
    const selectInStock = document.getElementById('stk-supplier-id');
    if (!selectInStock) return;

    const suppliers = window.dataCache.suppliers || {};
    const entries = Object.entries(suppliers);

    // 2. Tạo danh sách Option
    let htmlSelect = '<option value="">-- Chọn Nhà Cung Cấp --</option>';
    entries.forEach(([id, s]) => {
        // Hiển thị tên NCC và ID để nhân viên dễ chọn
        htmlSelect += `<option value="${id}">${s.Ten_NCC} (${s.SDT || 'No Phone'})</option>`;
    });

    selectInStock.innerHTML = htmlSelect;
    console.log("✅ Đã liên kết danh sách NCC vào Modal Nhập kho");
},
editStock: (id) => {
    // 1. Lấy dữ liệu từ bộ nhớ tạm
    const s = window.dataCache.stocks[id];
    if (!s) return alert("Không tìm thấy dữ liệu phiếu nhập!");

    // 2. Mở modal và làm sạch trạng thái cũ
    if (typeof app.initStockModal === 'function') {
        app.initStockModal(); 
    }
    window.ui.openModal('stock');

    // 3. Đổ dữ liệu vào Modal sau khi giao diện đã sẵn sàng
    setTimeout(() => {
        // Gán ID để biết đang ở chế độ sửa
        const editIdEl = document.getElementById('stock-edit-id');
        if (editIdEl) editIdEl.value = id;

        // Điền thông tin Nhà cung cấp và Trạng thái
        const supIdEl = document.getElementById('stk-supplier-id');
        const statusEl = document.getElementById('stk-status');
        const vatEl = document.getElementById('stk-vat');

        if (supIdEl) supIdEl.value = s.supplierId || "";
        if (statusEl) statusEl.value = s.status || "Chưa thanh toán";
        if (vatEl) vatEl.value = s.vatPercent || 0;

        // QUAN TRỌNG: Nạp danh sách món hàng vào mảng tạm thời
        // Nếu s.items là mảng (bản đa năng), nếu không có thì tạo mảng từ dữ liệu đơn cũ
        if (s.items && Array.isArray(s.items)) {
            window.stkItems = [...s.items];
        } else {
            // Hỗ trợ convert dữ liệu từ các phiếu nhập đơn cũ sang dạng mảng
            window.stkItems = [{
                productId: s.productId,
                name: s.productName,
                qty: s.qty,
                price: s.price,
                total: s.total
            }];
        }

        // Vẽ lại bảng món ăn và tính toán lại tiền
        app.renderStockItemsList();
        app.calculateStockTotal();
        
        // Cập nhật các trường thanh toán ẩn hiện (nếu có)
        if (window.ui.toggleStockPaymentFields) window.ui.toggleStockPaymentFields();
        
        console.log("✅ Đã nạp dữ liệu sửa cho phiếu:", id);
    }, 150);
},
filterStockProduct: (keyword) => {
    const listContainer = document.getElementById('stk-product-dropdown');
    if (!listContainer) return;
    
    const services = window.dataCache.services || {};
    const key = keyword.toLowerCase().trim();
    
    if (key === "") {
        listContainer.classList.add('hidden');
        return;
    }

    let html = '';
    Object.entries(services).forEach(([sid, s]) => {
        const name = s.Ten_Dich_Vu || "";
        if (name.toLowerCase().includes(key)) {
            html += `
                <div onclick="app.selectProductForStock('${sid}', '${name}')" 
                     class="p-3 cursor-pointer border-b border-slate-50 flex justify-between items-center hover:bg-indigo-50 transition-all">
                    <div class="flex flex-col">
                        <span class="text-[11px] font-black text-slate-700 uppercase">${name}</span>
                        <span class="text-[9px] text-indigo-500 font-bold italic">${s.Loai_DV || "Chung"}</span>
                    </div>
                    <span class="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Tồn: ${s.Ton_Kho || 0}</span>
                </div>`;
        }
    });

    listContainer.innerHTML = html || '<div class="p-4 text-[10px] text-slate-400 text-center italic">Không tìm thấy món</div>';
    listContainer.classList.remove('hidden');
},

// 2. Hàm chọn sản phẩm từ danh sách gợi ý
selectProductForStock: (id, name) => {
    const inputSearch = document.getElementById('stk-product-search');
    const inputId = document.getElementById('stk-product-id');
    const dropdown = document.getElementById('stk-product-dropdown');

    if (inputSearch) inputSearch.value = name;
    if (inputId) inputId.value = id;
    if (dropdown) dropdown.classList.add('hidden');
    
    // Tự động nhảy sang ô số lượng
    document.getElementById('stk-qty').focus();
},

// 3. Hàm thêm món vào bảng (Hàm bạn đang thiếu)
addItemToStockList: () => {
    const prodId = document.getElementById('stk-product-id').value;
    const prodName = document.getElementById('stk-product-search').value;
    const qty = Number(document.getElementById('stk-qty').value || 0);
    const price = Number(document.getElementById('stk-price').value || 0);

    if (!prodId || qty <= 0) return alert("Vui lòng tìm chọn sản phẩm và nhập số lượng!");

    // Khởi tạo mảng tạm nếu chưa có
    if (!window.stkItems) window.stkItems = [];

    // Thêm vào danh sách
    window.stkItems.push({
        productId: prodId,
        name: prodName,
        qty: qty,
        price: price,
        total: qty * price
    });

    // --- RESET FORM NHẬP NHANH ---
    document.getElementById('stk-product-id').value = "";
    document.getElementById('stk-product-search').value = "";
    document.getElementById('stk-qty').value = "";
    document.getElementById('stk-price').value = "";
    document.getElementById('stk-product-search').focus();

    // Cập nhật giao diện bảng và tính tổng tiền
    app.renderStockItemsList();
    app.calculateStockTotal();
},
// 4. Hàm vẽ lại bảng món ăn trong Modal
renderStockItemsList: () => {
    const container = document.getElementById('stk-items-table-body');
    if (!container) return;

    let html = '';
    (window.stkItems || []).forEach((item, index) => {
        html += `
            <tr class="border-b border-slate-100">
                <td class="px-4 py-3 uppercase text-[10px] font-black">${item.name}</td>
                <td class="px-4 py-3 text-center font-black">${item.qty}</td>
                <td class="px-4 py-3 text-right">${item.price.toLocaleString()}đ</td>
                <td class="px-4 py-3 text-right font-black text-indigo-600">${item.total.toLocaleString()}đ</td>
                <td class="px-4 py-3 text-center">
                    <button onclick="app.removeItemFromStock(${index})" class="text-rose-500 hover:scale-125 transition-transform">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>`;
    });
    
    container.innerHTML = html || '<tr><td colspan="5" class="py-20 text-center opacity-20 italic">Chưa có món nào</td></tr>';
    
    const countEl = document.getElementById('stk-item-count');
    if (countEl) countEl.innerText = (window.stkItems || []).length;
},

// 5. Hàm xóa món khỏi danh sách tạm
removeItemFromStock: (index) => {
    window.stkItems.splice(index, 1);
    app.renderStockItemsList();
    app.calculateStockTotal();
},

updatePrintPreview: () => {
    const name = document.getElementById('sys-name')?.value || "TÊN SÂN CỦA BẠN";
    const address = document.getElementById('sys-address')?.value || "Địa chỉ sân tại đây";
    const phone = document.getElementById('sys-phone')?.value || "0900.000.000";
    const footer = document.getElementById('sys-footer')?.value || "Cảm ơn quý khách. Hẹn gặp lại!";
    const bankId = document.getElementById('sys-bank-id')?.value || "mbbank";
    const bankNo = document.getElementById('sys-bank-no')?.value || "123456789";

    document.getElementById('view-sys-name').innerText = name;
    document.getElementById('view-sys-address').innerText = address;
    document.getElementById('view-sys-phone').innerText = "SĐT: " + phone;
    document.getElementById('view-sys-footer').innerText = footer;

    // Cập nhật mã QR thanh toán
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${bankNo}-compact.png?amount=0&addTag=0`;
    const qrImg = document.getElementById('view-sys-qr');
    if (qrImg) qrImg.src = qrUrl;
},

saveSystemConfig: async () => {
    try {
        const configData = {
            name: document.getElementById('sys-name').value.trim(),
            address: document.getElementById('sys-address').value.trim(),
            phone: document.getElementById('sys-phone').value.trim(),
            footer: document.getElementById('sys-footer').value.trim(),
            bankId: document.getElementById('sys-bank-id').value.trim(),
            bankNo: document.getElementById('sys-bank-no').value.trim()
        };

        if (!configData.name) return alert("Vui lòng nhập tên sân!");

        await window.set(window.ref(window.db, 'systemConfig'), configData);
        alert("✅ Đã lưu cấu hình hệ thống thành công!");
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
},
reprintBill: (id) => {
    const bill = window.dataCache.bills[id];
    if (!bill) return alert("Không tìm thấy dữ liệu hóa đơn!");

    // Chuẩn bị dữ liệu để gửi qua file print.html
    const printData = {
        Id: id.toString().slice(-8), // Lấy 8 ký tự cuối làm mã HD
        Items: bill.Items || [],     // Danh sách món đã lưu trong bill
        Total: bill.Tong_Tien || 0,
        Customer: bill.Khach_Hang || "Khách lẻ",
        Date: bill.Thoi_Gian || ""
    };

    // Gọi hàm handlePrintOrder đã có sẵn trong file của bạn
    if (typeof window.handlePrintOrder === 'function') {
        window.handlePrintOrder(printData);
    } else {
        alert("Lỗi: Không tìm thấy hệ thống in ấn!");
    }
},

// Thêm vào window.app = { ... }

switchBookingView: (mode) => {
    const timeline = document.getElementById('booking-view-timeline');
    const list = document.getElementById('booking-view-list');
    const filter = document.getElementById('booking-list-filter');
    const btnTimeline = document.getElementById('view-mode-timeline');
    const btnList = document.getElementById('view-mode-list');

    // Kiểm tra an toàn để tránh lỗi nếu thiếu HTML
    if (!timeline || !list) return;

    if (mode === 'list') {
        // 1. Hiển thị danh sách, ẩn timeline
        timeline.classList.add('hidden');
        list.classList.remove('hidden');
        if (filter) filter.classList.remove('hidden');

        // 2. Cập nhật Style nút bấm
        if (btnList) btnList.className = "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all bg-white shadow-sm text-blue-500";
        if (btnTimeline) btnTimeline.className = "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all text-slate-400";

        // 3. BỔ SUNG: Lấy filter hiện tại và Render dữ liệu
        const filterSelect = document.querySelector('#booking-list-filter select');
        const currentFilter = filterSelect ? filterSelect.value : 'today';
        app.renderBookingList(currentFilter);
        
    } else {
        // 1. Hiển thị timeline, ẩn danh sách
        timeline.classList.remove('hidden');
        list.classList.add('hidden');
        if (filter) filter.classList.add('hidden');

        // 2. Cập nhật Style nút bấm
        if (btnTimeline) btnTimeline.className = "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all bg-white shadow-sm text-blue-500";
        if (btnList) btnList.className = "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all text-slate-400";
        
        // 3. BỔ SUNG: Reload lại timeline để đảm bảo dữ liệu mới nhất
        if (app.reloadTimeline) app.reloadTimeline();
    }
},

renderBookingList: (range) => {
    const container = document.getElementById('booking-list-render');
    if (!container) return;

    const bookings = window.dataCache.bookings || {};
    let list = Object.entries(bookings).map(([id, b]) => ({ id, ...b }));

    // --- BỔ SUNG: Lấy ngày đang hiển thị trên ô input view-date ---
    const viewDateInput = document.getElementById('view-date');
    const selectedDateStr = viewDateInput ? viewDateInput.value : ""; 

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const getBookingDate = (b) => {
        const rawDate = b.Ngay || b.ngay || ""; 
        if (!rawDate) return null;
        return new Date(rawDate);
    };

    const filteredList = list.filter(b => {
        // Lấy ngày của từng booking (định dạng yyyy-mm-dd)
        const bDateStr = b.Ngay || b.ngay || "";

        // ƯU TIÊN 1: Nếu range truyền vào là một ngày cụ thể (yyyy-mm-dd) từ nút bấm lùi/tiến
        if (range && range.includes('-') && range.length === 10) {
            return bDateStr === range;
        }

        // ƯU TIÊN 2: Nếu sử dụng các nút lọc nhanh (Hôm nay, Ngày mai...)
        const bDate = getBookingDate(b);
        if (!bDate) return false;
        bDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((bDate - now) / (1000 * 60 * 60 * 24));

        if (range === 'today') return diffDays === 0;
        if (range === 'tomorrow') return diffDays === 1;
        if (range === 'this-week') return diffDays >= 0 && diffDays <= 7;
        if (range === 'next-week') return diffDays > 7 && diffDays <= 14;

        // MẶC ĐỊNH: Nếu không truyền range, lọc theo ngày đang hiển thị trên ô view-date
        return bDateStr === selectedDateStr;
    });

    // --- PHẦN SẮP XẾP VÀ RENDER GIỮ NGUYÊN NHƯ CŨ ---
    filteredList.sort((a, b) => {
        const dA = getBookingDate(a)?.getTime() || 0;
        const dB = getBookingDate(b)?.getTime() || 0;
        if (dA !== dB) return dA - dB;
        return (a.Bat_Dau || "").localeCompare(b.Bat_Dau || "");
    });

    if (filteredList.length === 0) {
        container.innerHTML = `<tr><td colspan="8" class="py-20 text-center opacity-20 italic uppercase text-[10px]">Không có lịch đặt phù hợp</td></tr>`;
        return;
    }

    container.innerHTML = filteredList.map(b => {
        const dDate = b.Ngay || "---";
        const dName = b.Ten_Khach || "Khách lẻ";
        const dPhone = b.SDT || "---";
        const courtObj = window.dataCache.courts ? window.dataCache.courts[b.Court_ID] : null;
        const dCourt = courtObj ? courtObj.Ten_San : (b.Court_ID || "N/A");
        const dIn = b.Bat_Dau || "--:--";
        const dOut = b.Ket_Thuc || "--:--";
        const dDeposit = Number(b.Tien_Coc || b.Cọc || 0);
        const dNote = b.Ghi_Chu || "";
        const dStatus = b.Trang_Thai || "Chờ nhận sân";
        
        const statusColor = dStatus.includes("xác nhận") || dStatus.includes("đặt") || dStatus.includes("Chờ")
            ? 'bg-emerald-100 text-emerald-600' 
            : 'bg-amber-100 text-amber-600';

        return `
            <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-all group">
                <td class="px-4 py-4 text-slate-400 font-medium">${dDate}</td>
                <td class="px-4 py-4">
                    <div class="font-black uppercase text-slate-800 text-[11px]">${dName}</div>
                    <div class="text-[9px] text-indigo-500 font-bold italic">${dPhone}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-[900] border border-indigo-100 uppercase italic">
                        ${dCourt}
                    </span>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="flex items-center justify-center gap-2 text-slate-700 font-black text-[11px]">
                        <span>${dIn}</span>
                        <i class="fa-solid fa-arrow-right text-[8px] text-slate-300"></i>
                        <span>${dOut}</span>
                    </div>
                </td>
                <td class="px-4 py-4 text-right font-black text-rose-500 text-[11px]">
                    ${dDeposit > 0 ? dDeposit.toLocaleString() + 'đ' : '-'}
                </td>
                <td class="px-4 py-4">
                    <p class="max-w-[120px] truncate text-[10px] text-slate-400 italic" title="${dNote}">
                        ${dNote || '...'}
                    </p>
                </td>
                <td class="px-4 py-4 text-center">
                    <span class="text-[8px] font-black uppercase px-2 py-1 rounded-md ${statusColor}">
                        ${dStatus}
                    </span>
                </td>
                <td class="px-4 py-4 text-right">
                    <div class="flex justify-end gap-1.5">
                        <button onclick="app.checkInBooking('${b.id}')" 
                            class="bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-700 active:scale-95 transition-all">
                            Vào sân
                        </button>
                        <button onclick="app.editBooking('${b.id}')" 
                            class="bg-slate-100 text-slate-400 p-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="app.deleteBooking('${b.id}')" 
                            class="bg-slate-100 text-slate-400 p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
},
checkInBooking: async (bookingId) => {
    // 1. Kiểm tra ID đầu vào
    if (!bookingId) return alert("Không tìm thấy mã lịch đặt!");

    // 2. Lấy dữ liệu từ Cache (đã được onValue cập nhật realtime)
    const b = window.dataCache.bookings[bookingId];
    if (!b) return alert("Dữ liệu lịch đặt không tồn tại hoặc đã được xử lý!");

    // Hỏi xác nhận để tránh bấm nhầm
    if (!confirm(`Xác nhận cho khách [${b.Ten_Khach || 'Khách lẻ'}] vào sân?`)) return;

    try {
        // Lấy giờ hiện tại để ghi nhận giờ vào thực tế
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ":" + 
                          now.getMinutes().toString().padStart(2, '0');

        // Lấy số tiền cọc (Chuyển về kiểu số để tính toán)
        const depositAmount = Number(b.Tien_Coc || b.Cọc || 0); 

        // 3. Chuẩn bị dữ liệu để "Kích hoạt" sân tương ứng
        const courtUpdate = {
            Trang_Thai: "Đang chơi",
            Ten_Khach: b.Ten_Khach || "Khách đặt lịch",
            SDT: b.SDT || "",
            Gio_Vao: currentTime,
            Member_ID: b.Member_ID || "",
            Loai_Khach: b.Loai_Khach || "Vãng lai",
            Da_Coc: depositAmount 
        };

        // 4. BƯỚC QUAN TRỌNG: Cập nhật thông tin vào Sân
        // Sử dụng Court_ID có sẵn trong dữ liệu đặt lịch
        await window.update(window.ref(window.db, `courts/${b.Court_ID}`), courtUpdate);
        
        // 5. BƯỚC QUYẾT ĐỊNH: Xóa lịch đặt khỏi danh sách Bookings
        // Khi xóa dòng này, Firebase sẽ báo cho app và danh sách sẽ tự mất dòng này
        await window.remove(window.ref(window.db, `bookings/${bookingId}`));

        // 6. Thông báo và phản hồi UI
        alert(`✅ Thành công!\nKhách: ${b.Ten_Khach}\nSân: ${b.Court_ID}\nĐã chuyển sang sơ đồ sân.`);
        
    } catch (e) {
        console.error("Lỗi khi chuyển dữ liệu từ danh sách:", e);
        alert("Có lỗi xảy ra: " + e.message);
    }
},

editBooking: (id) => {
    // Logic: Lấy dữ liệu từ window.dataCache.bookings[id] và đổ vào Modal Sửa
    const data = window.dataCache.bookings[id];
    if (data) {
        // Ví dụ: Mở modal và điền thông tin khách
        // app.openBookingModal('edit', {id, ...data}); 
        console.log("Đang sửa ca đặt:", data);
        alert("Tính năng sửa đang được kết nối với Modal của bạn...");
    }
},

deleteBooking: async (bookingId) => {
    const b = window.dataCache.bookings[bookingId];
    if (!b) return;

    if (!confirm(`Bạn có chắc chắn muốn XÓA lịch đặt của [${b.Ten_Khach}]?\nLưu ý: Hành động này sẽ xóa vĩnh viễn ca đặt này.`)) return;

    try {
        await window.remove(window.ref(window.db, `bookings/${bookingId}`));
        // Không cần gọi hàm render lại, Firebase onValue sẽ tự làm việc đó
    } catch (e) {
        alert("Lỗi khi xóa: " + e.message);
    }
},
changeViewDate: (offset) => {
    const dateInput = document.getElementById('view-date');
    if (!dateInput) return;

    let currentDate = dateInput.value ? new Date(dateInput.value) : new Date();
    currentDate.setDate(currentDate.getDate() + offset);
    
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getDate()).padStart(2, '0');
    
    const newDateStr = `${yyyy}-${mm}-${dd}`;
    dateInput.value = newDateStr;

    // 1. Cập nhật Timeline
    if (window.app.reloadTimeline) window.app.reloadTimeline();

    // 2. Cập nhật Danh sách (Dùng chính cái ngày vừa chọn)
    if (window.app.renderBookingList) {
        window.app.renderBookingList(newDateStr); 
    }
},
clearPosCart: () => {
    if (!window.posCart || window.posCart.length === 0) return;

    if (confirm("Xóa giỏ hàng và hoàn trả số lượng vào kho?")) {
        window.posCart.forEach(item => {
            const product = window.dataCache.services[item.id];
            if (product && product.Loai_DV !== "DỊCH VỤ") {
                // Cộng trả lại kho ảo trong Cache
                product.Ton_Kho = Number(product.Ton_Kho) + Number(item.qty);
            }
        });

        window.posCart = [];
        app.renderPOSCart();
        app.renderPosProducts(); // Vẽ lại để thấy số tồn quay về ban đầu
    }
},


    toggleMaintenance: (id, cur) => window.update(window.ref(window.db, 'courts/' + id), { Trang_Thai: cur === "Bảo trì" ? "Sẵn sàng" : "Bảo trì" }),
    deleteItem: (path) => { if(confirm("Xác nhận xóa vĩnh viễn?")) window.remove(window.ref(window.db, path)); }
};

// Bước bổ trợ: Tự động đóng menu khi người dùng nhấn ra bất kỳ đâu ngoài menu
window.addEventListener('click', (e) => {
    const manageMenu = document.getElementById('dropdown-manage');
    const userMenu = document.getElementById('dropdown-user');
    
    // Nếu vị trí click không nằm trong nút bấm hoặc nội dung menu thì ẩn đi
    if (manageMenu && !manageMenu.contains(e.target)) manageMenu.classList.add('hidden');
    if (userMenu && !userMenu.contains(e.target)) userMenu.classList.add('hidden');
});


// 4. Hàm in ấn & đồng bộ logic với print.html
window.handlePrintOrder = function(billData) {
    if (!billData) return;
    const pWin = window.open('print.html', '_blank', 'width=450,height=600');
    const timer = setInterval(() => {
        pWin.postMessage({ bill: billData, sys: window.dataCache.systemConfig || {} }, '*');
        if (pWin.closed) clearInterval(timer);
    }, 500);
};

console.log("🚀 Hệ thống PMS Logic ĐẦY ĐỦ đã sẵn sàng.");