window.ui = {
    // 1. CHUYỂN TAB VÀ KÍCH HOẠT VẼ DỮ LIỆU
    switchTab: (id) => {
        // Ẩn hiện tab và xử lý class hidden của Tailwind
        document.querySelectorAll('.tab-content').forEach(t => {
            t.classList.remove('active');
            t.classList.add('hidden');
        });
        
        const targetTab = document.getElementById('tab-' + id);
        if (targetTab) {
            targetTab.classList.add('active');
            targetTab.classList.remove('hidden');
        }

        // Đổi màu nút bấm Menu
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const targetBtn = document.getElementById('btn-' + id);
        if (targetBtn) targetBtn.classList.add('active');

        // KÍCH HOẠT VẼ LẠI DỮ LIỆU CHO TỪNG TAB
        if (!window.app) return;

        if (id === 'pos') {
            console.log("Kích hoạt POS...");
            if (typeof window.app.renderPosProducts === 'function') window.app.renderPosProducts();
        }

        if (id === 'service') {
            console.log("Kích hoạt Tab Dịch vụ...");
            if (typeof window.app.renderServicesTable === 'function') window.app.renderServicesTable();
        }
        // Trong ui-controller.js
if (id === 'suppliers') {
    // 1. Vẽ ngay lập tức (nếu cache đã có sẵn dữ liệu từ lần load trước)
    if (window.app && window.app.renderSupplierTable) {
        window.app.renderSupplierTable();
    }

    // 2. Phòng hờ trường hợp mạng chậm, thử vẽ lại sau 300ms
    setTimeout(() => {
        if (window.app && window.app.renderSupplierTable) {
            window.app.renderSupplierTable();
        }
    }, 300);
}

// Thêm vào trong openModal
else if (type === 'supplier') {
    if (!id) { // Thêm mới
        document.getElementById('supplier-edit-id').value = "";
        document.getElementById('sup-name').value = "";
        document.getElementById('sup-phone').value = "";
        document.getElementById('sup-address').value = "";
    }
}

        if (id === 'court') {
            console.log("Kích hoạt Tab Sân...");
            if (typeof window.app.renderCourtsTable === 'function') window.app.renderCourtsTable();
        }

        if (id === 'reports') {
    // 1. Mặc định lùi ngày bắt đầu về 30 ngày trước để báo cáo có dữ liệu ngay
    const dateTo = new Date().toISOString().split('T')[0];
    const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (document.getElementById('report-date-from')) document.getElementById('report-date-from').value = dateFrom;
    if (document.getElementById('report-date-to')) document.getElementById('report-date-to').value = dateTo;

    // 2. Chạy hàm tính toán
    if (window.app && typeof window.app.loadReports === 'function') {
        window.app.loadReports();
    }
}
    // Tìm trong ui.switchTab và thêm đoạn này:
if (id === 'stock') {
    console.log("Kích hoạt Tab Nhập kho...");
    if (typeof window.app.renderStockTable === 'function') {
        window.app.renderStockTable();
    }
}
        if (id === 'bill') {
            if (typeof window.app.renderBills === 'function') window.app.renderBills();
        }
    },

    // 2. QUẢN LÝ MODAL (MỞ/ĐÓNG)
    openModal: (type, id = null, data = null) => {
        console.log("Mở modal:", type);

        // Xử lý dữ liệu đặc thù cho từng loại Modal trước khi hiện
        if (type === 'booking') {
            const todayStr = new Date().toISOString().split('T')[0];
            const bDateInput = document.getElementById('b-date');
            if (bDateInput) {
                bDateInput.setAttribute('min', todayStr);
                const viewDate = document.getElementById('view-date').value;
                bDateInput.value = viewDate || todayStr;
            }
            window.ui.toggleBookingType();
        } 

        else if (type === 'manage-booking') {
    window.currentBooking = { id: id, ...data };
    document.getElementById('manage-b-id').value = id;
    document.getElementById('manage-b-name').value = data?.Ten_Khach || "";
    document.getElementById('manage-b-phone').value = data?.SDT || "";
    document.getElementById('manage-b-start').value = data?.Bat_Dau || "";
    document.getElementById('manage-b-end').value = data?.Ket_Thuc || "";
    document.getElementById('manage-b-note').value = data?.Ghi_Chu || "";
    
    // THÊM DÒNG NÀY ĐỂ HIỂN THỊ TIỀN CỌC CŨ
    const depositInput = document.getElementById('manage-b-deposit');
    if (depositInput) {
        depositInput.value = data?.Tien_Coc || 0;
    }
}

        else if (type === 'court') {
            document.getElementById('court-id').value = id || "";
            document.getElementById('c-name').value = data?.Ten_San || "";
            if (window.app.renderCourtTypes) window.app.renderCourtTypes();
            setTimeout(() => {
                const selectType = document.getElementById('c-type');
                if (selectType) selectType.value = data?.Loai_San || "";
            }, 100);
        }

        else if (type === 'court-type') {
            if (window.app.renderCourtTypes) window.app.renderCourtTypes();
        }

        // Tìm trong ui.openModal
        else if (type === 'service') {
            // 1. Gán ID (Nếu là thêm mới thì id = "", nếu là sửa thì id có giá trị)
            document.getElementById('service-id').value = id || "";

            // 2. Lấy dữ liệu từ data (truyền vào) hoặc từ cache (dựa vào id)
            let d = data || (id ? window.dataCache?.services?.[id] : null);

            // 3. ĐỔ DỮ LIỆU VÀO CÁC Ô INPUT (Phải có đầy đủ các dòng này)
            document.getElementById('s-name').value = d?.Ten_Dich_Vu || "";
            document.getElementById('s-price').value = d?.Gia_Ban || 0;
            document.getElementById('s-stock').value = d?.Ton_Kho || 0;
            document.getElementById('s-img').value = d?.Hinh_Anh || "";

            // 4. Vẽ lại danh sách phân loại vào ô Select trước
            if (window.app.renderServiceCategories) {
                window.app.renderServiceCategories();
            }
            
            // 5. Dùng setTimeout để đợi ô Select render xong các <option> rồi mới gán giá trị
            setTimeout(() => {
                const catSelect = document.getElementById('s-category');
                if (catSelect) {
                    catSelect.value = d?.Loai_DV || "";
                }
            }, 100); // Tăng lên 100ms để đảm bảo an toàn
        }

        else if (type === 'category-manager') {
            if (window.app && window.app.renderServiceCategories) {
                window.app.renderServiceCategories();
            }
        }
        
        else if (type === 'member') {
            document.getElementById('member-id').value = id || "";
            document.getElementById('m-name').value = data?.Ten_HV || "";
            document.getElementById('m-phone').value = data?.SDT || "";
            document.getElementById('m-wallet').value = data?.Vi_Du || 0;
        }

        else if (type === 'recharge') {
            document.getElementById('recharge-member-id').value = id;
            document.getElementById('recharge-member-name').innerText = "Hội viên: " + (data?.Ten_HV || "");
            document.getElementById('recharge-amount').value = "";
        }

        const modalEl = document.getElementById('modal-' + type);
        if (modalEl) modalEl.classList.add('active');
    },

    closeModal: (type) => {
        const modalEl = document.getElementById('modal-' + type);
        if (modalEl) modalEl.classList.remove('active');
    },

    // 3. LOGIC NGHIỆP VỤ GIAO DIỆN (CHECK-IN, BOOKING, POS)
    toggleCheckinMode: () => {
        const mode = document.getElementById('checkin-mode').value;
        document.getElementById('checkin-walkin-box').classList.toggle('hidden', mode !== 'walk-in');
        document.getElementById('checkin-member-box').classList.toggle('hidden', mode !== 'member');
    },

    toggleBookingType: () => {
        const radio = document.querySelector('input[name="b-customer-type"]:checked');
        if (!radio) return;
        const type = radio.value;
        const nameCont = document.getElementById('b-name-container');
        const membCont = document.getElementById('b-member-container');
        
        if (type === 'Hội viên') {
            nameCont?.classList.add('hidden');
            membCont?.classList.remove('hidden');
            let listHtml = '';
            for (let id in window.dataCache.members) {
                const m = window.dataCache.members[id];
                listHtml += `<option value="${m.Ten_HV}" data-id="${id}">${m.SDT}</option>`;
            }
            const listEl = document.getElementById('b-member-list');
            if (listEl) listEl.innerHTML = listHtml;
        } else {
            nameCont?.classList.remove('hidden');
            membCont?.classList.add('hidden');
        }
    },

    onSearchMemberBooking: (el) => {
        const val = el.value.trim().toLowerCase();
        const list = document.getElementById('b-member-list');
        const phoneInput = document.getElementById('b-phone');
        const idInput = document.getElementById('b-member-id');
        const members = window.dataCache?.members;
        if (!list || !members) return;

        let html = '';
        Object.entries(members).forEach(([id, m]) => {
            const ten = m.Ten_HV || "Không tên"; 
            const sdt = m.SDT || "";
            if (val === "" || ten.toLowerCase().includes(val) || sdt.includes(val)) {
                html += `<option value="${ten}">SĐT: ${sdt}</option>`;
            }
        });
        list.innerHTML = html;

        const foundMember = Object.entries(members).find(([id, m]) => (m.Ten_HV && m.Ten_HV === el.value.trim()));
        if (foundMember) {
            idInput.value = foundMember[0];
            phoneInput.value = foundMember[1].SDT || '';
        } else {
            idInput.value = '';
        }
    },

    // Thêm vào window.ui
toggleStockPaymentFields: () => {
    const status = document.getElementById('stk-status').value;
    const wrap = document.getElementById('stk-payment-method-wrap');
    if (status === 'Đã thanh toán') {
        wrap.classList.remove('hidden');
    } else {
        wrap.classList.add('hidden');
    }
},

// Hàm xử lý đóng/mở menu dropdown
   toggleDropdown: (event, id) => {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const target = document.getElementById(id);
    if (!target) return;

    // 1. Đóng các dropdown khác
    const dropdowns = ['dropdown-manage', 'dropdown-user'];
    dropdowns.forEach(dId => {
        if (dId !== id) {
            const el = document.getElementById(dId);
            if (el) el.classList.add('hidden');
        }
    });

    // 2. Bật/Tắt menu hiện tại
    target.classList.toggle('hidden');

    // 3. TỰ ĐỘNG ẨN KHI RÊ CHUỘT RA NGOÀI (Bổ sung mới)
    // Nếu menu đang hiển thị, gắn sự kiện lắng nghe chuột rời đi
    if (!target.classList.contains('hidden')) {
        target.onmouseleave = () => {
            target.classList.add('hidden');
        };
        
        // Gắn thêm cho cả nút bấm để nếu chuột rời cả nút lẫn menu thì ẩn
        const parent = target.closest('.relative');
        if (parent) {
            parent.onmouseleave = () => {
                target.classList.add('hidden');
            };
        }
    }
},


    toggleAddService: () => {
        const box = document.getElementById('add-service-box');
        const select = document.getElementById('add-service-id');
        if (!box || !select) return;
        box.classList.toggle('hidden');
        if (!box.classList.contains('hidden')) {
            const services = window.dataCache.services || {};
            let html = '<option value="">-- Chọn món --</option>';
            Object.entries(services).forEach(([id, item]) => {
                html += `<option value="${id}">${item.Ten_Dich_Vu} (${Number(item.Gia_Ban).toLocaleString()}đ)</option>`;
            });
            select.innerHTML = html;
        }
    },

   clickTimeline: (courtId, hour) => {
    const now = new Date();
    const viewDateValue = document.getElementById('view-date').value;
    if (!viewDateValue) return;

    const viewDate = new Date(viewDateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(viewDate);
    compareDate.setHours(0, 0, 0, 0);

    // Chặn giờ quá khứ
    if (compareDate < today) {
        alert("Không thể đặt sân cho những ngày đã qua!");
        return;
    }

    const isToday = now.toDateString() === viewDate.toDateString();
    if (isToday && hour < now.getHours()) {
        const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        alert(`Không thể đặt lịch vào khung giờ đã qua! (Giờ hiện tại là ${currentTimeStr})`);
        return; 
    }

    // --- BƯỚC QUAN TRỌNG: Mở Modal trước ---
    // Đảm bảo ID trong HTML là "modal-booking"
    const modalEl = document.getElementById('modal-booking');
    if (modalEl) {
        modalEl.classList.add('active'); // Ép hiển thị bằng CSS class
    } else {
        // Nếu không tìm thấy bằng ID modal-booking, thử gọi hàm ui chung
        window.ui.openModal('booking');
    }

    // Sử dụng setTimeout ngắn hơn (50ms - 100ms) để điền dữ liệu
    setTimeout(() => {
        const elDate = document.getElementById('b-date');
        const elCourtSelect = document.getElementById('b-court-id');
        const elStart = document.getElementById('b-start');
        const elEnd = document.getElementById('b-end');

        // Nạp danh sách sân từ bộ nhớ tạm
        if (elCourtSelect) {
            const courts = window.dataCache.courts || {};
            let html = '<option value="">-- Chọn sân --</option>';
            Object.entries(courts).forEach(([id, c]) => {
                html += `<option value="${id}">${c.Ten_San}</option>`;
            });
            elCourtSelect.innerHTML = html;
            elCourtSelect.value = courtId; // Mặc định chọn sân đã click
        }

        if (elDate) elDate.value = viewDateValue;
        
        const startTime = `${hour.toString().padStart(2, '0')}:00`;
        const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
        
        if (elStart) elStart.value = startTime;
        if (elEnd) elEnd.value = endTime;

        console.log(`✅ Đã hiển thị Form đặt sân: ${courtId}`);
    }, 50); 
},

// --- BỔ SUNG LOGIC GIẢM GIÁ 2 Ô SONG SONG ---
    handleDiscountInput: (type) => {
        // 1. Lấy tổng tiền gốc (sau khi đã trừ giảm hạng hội viên và cọc, nhưng trước khi giảm tay)
        const baseTotal = Number(document.getElementById('base-total-without-manual').value || 0);
        const inputCash = document.getElementById('manual-discount-cash');
        const inputPercent = document.getElementById('manual-discount-percent');

        if (!inputCash || !inputPercent) return;

        if (type === 'cash') {
            // Nếu người dùng nhập số tiền -> Tính ra % tương ứng
            const cashValue = Number(inputCash.value || 0);
            const calculatedPercent = baseTotal > 0 ? (cashValue / baseTotal) * 100 : 0;
            // Hiển thị 1 chữ số thập phân cho %
            inputPercent.value = cashValue > 0 ? calculatedPercent.toFixed(1) : "";
        } else {
            // Nếu người dùng nhập % -> Tính ra số tiền mặt tương ứng
            const percentValue = Number(inputPercent.value || 0);
            const calculatedCash = (percentValue * baseTotal) / 100;
            // Làm tròn tiền mặt
            inputCash.value = percentValue > 0 ? Math.round(calculatedCash) : "";
        }

        // 2. Gọi hàm tính toán lại tổng cuối cùng
        window.ui.recalculateWithDiscount();
    },

    recalculateWithDiscount: () => {
        const baseTotal = Number(document.getElementById('base-total-without-manual').value || 0);
        const discountCash = Number(document.getElementById('manual-discount-cash').value || 0);
        const deposit = Number(window.dataCache.courts[window.selectedCourtId]?.Da_Coc || 0);
        
        // Tính tiền cuối cùng = (Tổng sau giảm hạng) - (Giảm giá tay) - (Tiền cọc nếu chưa trừ)
        // Lưu ý: Trong hàm openCheckout của bạn, base-total-without-manual thường đã bao gồm tiền cọc
        // nên ta chỉ cần trừ đi discountCash.
        const finalTotal = Math.max(0, baseTotal - discountCash);
        
        // Cập nhật vào các biến ẩn để hàm confirmPayment sử dụng
        document.getElementById('temp-bill-total').value = finalTotal;
        // manual-discount này dùng để lưu số tiền giảm vào hóa đơn sau này
        if (document.getElementById('manual-discount')) {
            document.getElementById('manual-discount').value = discountCash;
        }

        // Cập nhật số tiền hiển thị trên giao diện (Cần thanh toán)
        // Tìm thẻ span cuối cùng trong dòng "Cần thanh toán"
        const billContent = document.getElementById('bill-content');
        if (billContent) {
            const displayElements = billContent.querySelectorAll('div.flex.justify-between.font-black.text-xl span');
            if (displayElements.length > 0) {
                displayElements[displayElements.length - 1].innerText = finalTotal.toLocaleString() + "đ";
            }
        }
    },

    // --- LOGIC THANH TOÁN ---
   openCheckout: async () => {
    try {
        const currentId = window.selectedCourtId;
        if (!currentId) return alert("Không xác định được ID sân!");

        const courtRef = window.ref(window.db, `courts/${currentId}`);
        const snapshot = await window.get(courtRef);
        if (!snapshot.exists()) return alert("Không tìm thấy dữ liệu sân!");
        
        const court = snapshot.val();
        const conf = window.dataCache.config || {};
        const startTime = court.Gio_Vao;
        if (!startTime) return alert("Sân chưa có giờ vào!");

        const now = new Date();
        const endTime = now.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
        const [h1, m1] = startTime.split(':').map(Number);
        const minutes = (now.getHours() * 60 + now.getMinutes()) - (h1 * 60 + m1);
        
        // 1. TÍNH TIỀN GIỜ THEO CẤU HÌNH (LOẠI SÂN + GIỜ VÀNG)
        const priceList = conf.priceList || {};
        // Lấy giá theo loại sân, nếu không có thì lấy priceNormal
        let hourlyRate = parseInt(priceList[court.Loai_San] || conf.priceNormal || 100000);
        
        // Phụ phí giờ vàng
        if(startTime >= (conf.peakStart || "17:00")) {
            hourlyRate += parseInt(conf.pricePeak || 0);
        }

        // Phụ phí cuối tuần (Nếu có thiết lập %)
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        if (isWeekend && conf.weekendUp) {
            hourlyRate = hourlyRate * (1 + parseInt(conf.weekendUp) / 100);
        }

        let timeMoney = Math.ceil((Math.max(0, minutes/60 * hourlyRate)) / 1000) * 1000; 

        // 2. TÍNH TIỀN DỊCH VỤ
        let sMoney = 0; 
        let sLines = '';
        let services = court.Playing?.Services || court.Dich_Vu || {};
        if (typeof services !== 'object' || services === null) services = {};

        Object.values(services).forEach(item => {
            if (item && typeof item === 'object') {
                const p = parseInt(item.Price || item.Gia || 0);
                const q = parseInt(item.Qty || item.SL || item.So_Luong || 0);
                if (q > 0) {
                    sMoney += (p * q);
                    sLines += `
                        <div class="flex justify-between text-xs text-slate-600">
                            <span>${item.Name || item.Ten_Mon || item.Ten} x${q}</span>
                            <span>${(p * q).toLocaleString()}đ</span>
                        </div>`;
                }
            }
        });

        // 3. XỬ LÝ GIẢM GIÁ HỘI VIÊN (THEO HẠNG)
        let discountPercent = 0;
        let rankName = "Vãng lai";
        const memberBox = document.getElementById('member-rank-box');
        
        if (court.Member_ID && window.dataCache.members) {
            const member = window.dataCache.members[court.Member_ID];
            if (member) {
                rankName = member.Hang_HV || "Đồng";
                // Lấy % giảm từ config: mCopper, mSilver, mGold
                const rankKey = rankName === "Vàng" ? "mGold" : (rankName === "Bạc" ? "mSilver" : "mCopper");
                discountPercent = parseInt(conf[rankKey] || 0);

                // Hiển thị hạng lên giao diện (Nếu bạn đã thêm HTML member-rank-box)
                if (memberBox) {
                    memberBox.classList.remove('hidden');
                    document.getElementById('display-rank-name').innerText = rankName;
                    document.getElementById('display-rank-percent').innerText = discountPercent;
                }
            }
        } else if (memberBox) {
            memberBox.classList.add('hidden');
        }

        // 4. TỔNG HỢP TIỀN
        const deposit = Number(court.Da_Coc || 0);
        const subTotal = timeMoney + sMoney; // Tổng trước khi giảm hạng
        
        // Tính tiền giảm theo hạng
        const discountMoney = Math.round((subTotal * discountPercent) / 100);
        const finalTotal = Math.max(0, subTotal - discountMoney - deposit);

        // Gán giá trị vào các ô ẩn
        document.getElementById('temp-bill-total').value = finalTotal;
        document.getElementById('base-total-without-manual').value = subTotal - discountMoney;
        if (document.getElementById('manual-discount')) document.getElementById('manual-discount').value = 0;
        
        // 5. HIỂN THỊ LÊN GIAO DIỆN
        const billContent = document.getElementById('bill-content');
        if (billContent) {
            billContent.innerHTML = `
                <div class="space-y-3">
                    <div class="flex justify-between font-bold border-b border-slate-100 pb-2 text-slate-700">
                        <div>Tiền giờ (${startTime} - ${endTime})</div>
                        <span>${timeMoney.toLocaleString()}đ</span>
                    </div>
                    
                    <div class="py-1 space-y-1">
                        ${sLines || '<p class="text-[10px] text-slate-400 italic">Không có dịch vụ</p>'}
                    </div>

                    ${discountPercent > 0 ? `
                    <div class="flex justify-between text-emerald-600 text-xs font-bold italic">
                        <span>Giảm giá hạng ${rankName} (${discountPercent}%):</span>
                        <span>-${discountMoney.toLocaleString()}đ</span>
                    </div>` : ''}

                    ${deposit > 0 ? `
                    <div class="flex justify-between text-orange-600 font-bold bg-orange-50 p-2 rounded-lg border border-orange-100 italic text-xs">
                        <span>Đã trừ tiền đặt cọc:</span>
                        <span>-${deposit.toLocaleString()}đ</span>
                    </div>` : ''}

                    <div class="flex justify-between font-black text-xl text-blue-600 border-t-2 border-dashed pt-3 uppercase tracking-tighter">
                        <span>Cần thanh toán</span>
                        <span>${finalTotal.toLocaleString()}đ</span>
                    </div>
                </div>`;
        }

        window.ui.closeModal('court-detail');
        window.ui.openModal('checkout');
    } catch (err) { 
        console.error("Lỗi openCheckout:", err);
        alert("Lỗi: " + err.message); 
    }
}
};