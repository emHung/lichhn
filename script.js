// Hàm tự động điền ngày hiện tại
function setTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    document.getElementById('eventDate').value = `${year}-${month}-${day}`;
}

// Hàm định dạng ngày yyyy-mm-dd sang dd/mm/yyyy
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Hàm lấy giờ Việt Nam (GMT+7)
function getVietnamTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + 7 * 3600000);
}

document.addEventListener('DOMContentLoaded', function() {
    // Lấy các elements
    const eventForm = document.getElementById('eventForm');
    const eventsBody = document.getElementById('eventsBody');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const closeBtn = document.querySelector('.close');
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationClose = document.querySelector('.notification-close');
    const rewardNotification = document.getElementById('rewardNotification');
    const rewardClose = document.querySelector('.reward-close');
    const walletAmountElement = document.getElementById('walletAmount');
    const walletAmountContainer = walletAmountElement.parentElement;
    const activityDaysElement = document.getElementById('activityDays');
    const completedActivitiesElement = document.getElementById('completedActivities');
    const lastActiveDateElement = document.getElementById('lastActiveDate');
    const selectDate = document.getElementById('selectDate');
    
    // Mảng lưu trữ các sự kiện và số dư ví
    let events = JSON.parse(localStorage.getItem('events')) || [];
    let walletBalance = parseInt(localStorage.getItem('walletBalance')) || 0;
    
    // Lịch sử hoạt động
    let activityHistory = JSON.parse(localStorage.getItem('activityHistory')) || {
        firstDate: null,
        lastDate: null,
        activeDates: [], // Mảng lưu các ngày đã có hoạt động
        completedActivities: 0 // Số lượng hoạt động đã hoàn thành
    };
    
    // Biến lưu ngày hiện tại đang xem
    let currentDateView = null;
    
    // Cập nhật số dư ví ban đầu
    updateWalletDisplay();
    
    // Cập nhật hiển thị lịch sử
    updateHistoryDisplay();
    
    // Tự động điền ngày hiện tại cho input date
    setTodayDate();
    
    // Load các sự kiện đã lưu
    loadEvents();
    
    // Xử lý sự kiện khi form được submit
    eventForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Lấy giá trị từ form
        const timeStart = document.getElementById('timeStart').value;
        const timeEnd = document.getElementById('timeEnd').value;
        const eventName = document.getElementById('eventName').value;
        const eventDate = formatDate(document.getElementById('eventDate').value);
        const eventStatus = document.getElementById('eventStatus').value;
        
        // Tạo sự kiện mới
        const newEvent = {
            id: Date.now(), // Sử dụng timestamp làm ID
            timeStart,
            timeEnd,
            eventName,
            eventDate,
            eventStatus
        };
        
        // Thêm vào mảng và lưu vào localStorage
        events.push(newEvent);
        saveEvents();
        
        // Cập nhật lịch sử hoạt động
        updateActivityHistory(eventDate, eventStatus);
        
        // Cập nhật giao diện
        addEventToTable(newEvent);
        
        // Hiển thị thông báo
        showNotification('Thêm sự kiện thành công!');
        
        // Reset form và đặt lại ngày hiện tại
        eventForm.reset();
        setTodayDate();
        
        // Kiểm tra nếu sự kiện đã hoàn thành
        if (eventStatus === 'Đã hoàn thành') {
            checkAllCompleted();
        }
    });
    
    // Xử lý sự kiện khi edit form được submit
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Lấy ID của sự kiện cần chỉnh sửa
        const eventId = parseInt(document.getElementById('editId').value);
        
        // Lấy giá trị từ form
        const timeStart = document.getElementById('editTimeStart').value;
        const timeEnd = document.getElementById('editTimeEnd').value;
        const eventName = document.getElementById('editEventName').value;
        const eventDate = formatDate(document.getElementById('editEventDate').value);
        const eventStatus = document.getElementById('editEventStatus').value;
        
        // Lấy trạng thái cũ để kiểm tra nếu đã cập nhật thành "Đã hoàn thành"
        const oldEvent = events.find(event => event.id === eventId);
        const oldStatus = oldEvent?.eventStatus;
        const oldDate = oldEvent?.eventDate;
        
        // Tìm và cập nhật sự kiện
        const eventIndex = events.findIndex(event => event.id === eventId);
        if (eventIndex !== -1) {
            events[eventIndex] = {
                id: eventId,
                timeStart,
                timeEnd,
                eventName,
                eventDate,
                eventStatus
            };
            
            // Cập nhật lịch sử nếu trạng thái hoặc ngày thay đổi
            if (oldStatus !== eventStatus || oldDate !== eventDate) {
                // Nếu chuyển từ không hoàn thành -> hoàn thành, tăng số hoạt động hoàn thành
                if (oldStatus !== 'Đã hoàn thành' && eventStatus === 'Đã hoàn thành') {
                    activityHistory.completedActivities++;
                }
                // Nếu chuyển từ hoàn thành -> không hoàn thành, giảm số hoạt động hoàn thành
                else if (oldStatus === 'Đã hoàn thành' && eventStatus !== 'Đã hoàn thành') {
                    activityHistory.completedActivities = Math.max(0, activityHistory.completedActivities - 1);
                }
                
                // Cập nhật ngày hoạt động nếu ngày thay đổi
                if (oldDate !== eventDate) {
                    updateActivityDates();
                }
                
                // Lưu lịch sử
                saveActivityHistory();
                
                // Cập nhật hiển thị lịch sử
                updateHistoryDisplay();
            }
            
            // Lưu và cập nhật giao diện
            saveEvents();
            loadEvents();
            
            // Hiển thị thông báo
            showNotification('Cập nhật sự kiện thành công!');
            
            // Kiểm tra và cập nhật trạng thái hoàn thành nếu đã chuyển sang "Đã hoàn thành"
            if (oldStatus !== 'Đã hoàn thành' && eventStatus === 'Đã hoàn thành') {
                checkAllCompleted();
            }
            
            // Đóng modal
            closeModal();
        }
    });
    
    // Đóng modal khi nhấp vào nút đóng
    closeBtn.addEventListener('click', closeModal);
    
    // Đóng modal khi nhấp vào bên ngoài
    window.addEventListener('click', function(e) {
        if (e.target === editModal) {
            closeModal();
        }
    });
    
    // Đóng thông báo khi nhấp vào nút đóng
    notificationClose.addEventListener('click', function() {
        notification.classList.remove('show');
    });
    
    // Đóng thông báo reward khi nhấp vào nút đóng
    rewardClose.addEventListener('click', function() {
        rewardNotification.classList.remove('show');
        
        // Thêm tiền vào ví và cập nhật hiển thị
        addToWallet(10000);
    });
    
    // Tự động đóng thông báo sau 3 giây
    function autoCloseNotification() {
        setTimeout(function() {
            notification.classList.remove('show');
        }, 3000);
    }
    
    // Hàm thêm tiền vào ví
    function addToWallet(amount) {
        walletBalance += amount;
        localStorage.setItem('walletBalance', walletBalance);
        updateWalletDisplay();
        // Hiệu ứng highlight
        walletAmountContainer.classList.add('highlight');
        setTimeout(() => {
            walletAmountContainer.classList.remove('highlight');
        }, 2000);
    }
    
    // Hàm cập nhật hiển thị ví
    function updateWalletDisplay() {
        // Định dạng số dư với dấu phân cách hàng nghìn
        walletAmountElement.textContent = walletBalance.toLocaleString('vi-VN');
    }
    
    // Hàm cập nhật lịch sử hoạt động
    function updateActivityHistory(eventDate, eventStatus) {
        // Cập nhật ngày đầu tiên nếu chưa có
        if (!activityHistory.firstDate) {
            activityHistory.firstDate = eventDate;
        }
        
        // Cập nhật ngày gần nhất
        activityHistory.lastDate = getCurrentDate();
        
        // Thêm ngày vào mảng nếu chưa có
        if (!activityHistory.activeDates.includes(eventDate)) {
            activityHistory.activeDates.push(eventDate);
        }
        
        // Tăng số hoạt động đã hoàn thành nếu trạng thái là "Đã hoàn thành"
        if (eventStatus === 'Đã hoàn thành') {
            activityHistory.completedActivities++;
        }
        
        // Lưu lịch sử
        saveActivityHistory();
        
        // Cập nhật hiển thị lịch sử
        updateHistoryDisplay();
    }
    
    // Hàm cập nhật danh sách ngày hoạt động từ tất cả sự kiện
    function updateActivityDates() {
        const uniqueDates = new Set();
        
        // Lấy tất cả các ngày từ sự kiện
        events.forEach(event => {
            uniqueDates.add(event.eventDate);
        });
        
        // Cập nhật mảng ngày hoạt động
        activityHistory.activeDates = Array.from(uniqueDates);
        
        // Đếm lại số hoạt động đã hoàn thành
        activityHistory.completedActivities = events.filter(event => event.eventStatus === 'Đã hoàn thành').length;
        
        // Cập nhật ngày đầu tiên và cuối cùng
        if (activityHistory.activeDates.length > 0) {
            activityHistory.firstDate = activityHistory.activeDates.reduce((a, b) => 
                compareDates(a, b) < 0 ? a : b
            );
            
            activityHistory.lastDate = activityHistory.activeDates.reduce((a, b) => 
                compareDates(a, b) > 0 ? a : b
            );
        } else {
            activityHistory.firstDate = null;
            activityHistory.lastDate = null;
        }
    }
    
    // Hàm so sánh hai ngày có định dạng "dd/mm/yyyy"
    function compareDates(date1, date2) {
        const [day1, month1, year1] = date1.split('/').map(Number);
        const [day2, month2, year2] = date2.split('/').map(Number);
        
        if (year1 !== year2) return year1 - year2;
        if (month1 !== month2) return month1 - month2;
        return day1 - day2;
    }
    
    // Hàm cập nhật hiển thị lịch sử
    function updateHistoryDisplay() {
        // Tính số ngày đã hoạt động
        const activityDays = activityHistory.activeDates.length;
        
        // Cập nhật số ngày
        activityDaysElement.textContent = activityDays;
        
        // Cập nhật số hoạt động đã hoàn thành
        completedActivitiesElement.textContent = activityHistory.completedActivities;
        
        // Cập nhật ngày hoạt động gần nhất
        if (activityHistory.lastDate) {
            lastActiveDateElement.textContent = activityHistory.lastDate;
        } else {
            lastActiveDateElement.textContent = 'Chưa có';
        }
    }
    
    // Hàm lưu lịch sử hoạt động
    function saveActivityHistory() {
        localStorage.setItem('activityHistory', JSON.stringify(activityHistory));
    }
    
    // Hàm hiển thị thông báo
    function showNotification(message) {
        notificationMessage.textContent = message;
        notification.classList.add('show');
        autoCloseNotification();
    }
    
    // Hàm hiển thị phần thưởng
    function showReward() {
        rewardNotification.classList.add('show');
    }
    
    // Hàm đóng modal
    function closeModal() {
        editModal.style.display = 'none';
    }
    
    // Hàm mở modal và điền thông tin sự kiện
    function openEditModal(eventId) {
        const event = events.find(event => event.id === eventId);
        if (event) {
            document.getElementById('editId').value = event.id;
            document.getElementById('editTimeStart').value = event.timeStart;
            document.getElementById('editTimeEnd').value = event.timeEnd;
            document.getElementById('editEventName').value = event.eventName;
            
            // Định dạng lại ngày để hiển thị trong input type date
            const [day, month, year] = event.eventDate.split('/');
            document.getElementById('editEventDate').value = `${year}-${month}-${day}`;
            
            document.getElementById('editEventStatus').value = event.eventStatus;
            
            editModal.style.display = 'block';
        }
    }
    
    // Hàm xóa sự kiện
    function deleteEvent(eventId) {
        if (confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) {
            // Lưu trạng thái hoàn thành hiện tại
            const allCompletedBefore = checkIfAllCompleted();
            
            // Tìm sự kiện cần xóa để cập nhật lịch sử
            const eventToDelete = events.find(event => event.id === eventId);
            
            // Xóa sự kiện
            events = events.filter(event => event.id !== eventId);
            saveEvents();
            
            // Cập nhật lịch sử hoạt động
            if (eventToDelete && eventToDelete.eventStatus === 'Đã hoàn thành') {
                activityHistory.completedActivities = Math.max(0, activityHistory.completedActivities - 1);
            }
            updateActivityDates();
            saveActivityHistory();
            updateHistoryDisplay();
            
            // Cập nhật giao diện
            loadEvents();
            
            // Hiển thị thông báo
            showNotification('Xóa sự kiện thành công!');
            
            // Kiểm tra nếu tất cả sự kiện đã hoàn thành (sau khi xóa)
            const allCompletedAfter = checkIfAllCompleted();
            
            // Nếu trạng thái thay đổi từ chưa hoàn thành hết sang hoàn thành hết
            if (!allCompletedBefore && allCompletedAfter && events.length > 0) {
                showReward();
            }
        }
    }
    
    // Hàm lưu sự kiện vào localStorage
    function saveEvents() {
        localStorage.setItem('events', JSON.stringify(events));
    }
    
    // Hàm so sánh ngày và thời gian bắt đầu để sắp xếp sự kiện
    function compareEventDateTime(a, b) {
        // So sánh ngày
        const [dayA, monthA, yearA] = a.eventDate.split('/').map(Number);
        const [dayB, monthB, yearB] = b.eventDate.split('/').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);

        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;

        // Nếu ngày giống nhau, so sánh thời gian bắt đầu
        return a.timeStart.localeCompare(b.timeStart);
    }
    
    // Hàm lấy danh sách ngày duy nhất từ events
    function getUniqueDates() {
        const dateSet = new Set(events.map(e => e.eventDate));
        return Array.from(dateSet).sort((a, b) => compareDates(a, b));
    }

    // Hàm cập nhật dropdown ngày
    function updateDateDropdown() {
        const uniqueDates = getUniqueDates();
        selectDate.innerHTML = '';
        uniqueDates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            selectDate.appendChild(option);
        });
        // Nếu chưa chọn ngày hoặc ngày không còn trong danh sách, chọn ngày đầu tiên
        if (!currentDateView || !uniqueDates.includes(currentDateView)) {
            currentDateView = uniqueDates[0] || null;
        }
        selectDate.value = currentDateView;
    }

    // Lắng nghe sự kiện đổi ngày
    selectDate.addEventListener('change', function() {
        currentDateView = selectDate.value;
        loadEvents();
    });

    // Sửa hàm loadEvents để chỉ hiển thị sự kiện của ngày đang chọn
    function loadEvents() {
        events = JSON.parse(localStorage.getItem('events')) || [];
        // Sắp xếp trước khi hiển thị
        events.sort(compareEventDateTime);
        updateDateDropdown();
        eventsBody.innerHTML = '';
        if (!currentDateView) return;
        events.filter(event => event.eventDate === currentDateView).forEach(event => {
            addEventToTable(event);
        });
    }

    // Sửa hàm checkIfAllCompleted để kiểm tra theo ngày đang xem
    function checkIfAllCompletedByDate(date) {
        const eventsOfDate = events.filter(event => event.eventDate === date);
        if (eventsOfDate.length === 0) return false;
        return eventsOfDate.every(event => event.eventStatus === 'Đã hoàn thành');
    }

    // Sửa hàm checkAllCompleted để cộng thưởng, chuyển ngày, cập nhật lịch sử
    function checkAllCompleted() {
        if (checkIfAllCompletedByDate(currentDateView)) {
            showReward();
            // Khi đóng reward, cộng tiền, tăng số ngày hoàn thành, chuyển ngày
            rewardClose.onclick = function() {
                rewardNotification.classList.remove('show');
                addToWallet(10000);
                // Tăng số ngày hoàn thành
                activityHistory.completedActivities++;
                // Cập nhật ngày hoạt động gần nhất
                activityHistory.lastDate = currentDateView;
                saveActivityHistory();
                updateHistoryDisplay();
                // Chuyển sang ngày tiếp theo nếu có
                const uniqueDates = getUniqueDates();
                const idx = uniqueDates.indexOf(currentDateView);
                if (idx !== -1 && idx < uniqueDates.length - 1) {
                    const nextDate = uniqueDates[idx + 1];
                    // Reset trạng thái các sự kiện của ngày mới về 'Chưa bắt đầu' nếu chưa hoàn thành
                    events.forEach(event => {
                        if (event.eventDate === nextDate && event.eventStatus !== 'Đã hoàn thành') {
                            event.eventStatus = 'Chưa bắt đầu';
                        }
                    });
                    saveEvents();
                    currentDateView = nextDate;
                    selectDate.value = currentDateView;
                    loadEvents();
                }
            };
        }
    }

    // Khi tải ứng dụng lần đầu, chọn ngày đầu tiên nếu có
    if (!currentDateView) {
        const uniqueDates = getUniqueDates();
        currentDateView = uniqueDates[0] || null;
    }

    // Thêm một số sự kiện mẫu nếu danh sách trống
    if (events.length === 0) {
        const today = new Date();
        const day = today.getDate().toString().padStart(2, '0');
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const year = today.getFullYear();
        const formattedToday = `${day}/${month}/${year}`;
        
        const sampleEvents = [
            {
                id: 1,
                timeStart: '07:45',
                timeEnd: '08:00',
                eventName: 'Thức dậy & tập thể dục',
                eventDate: formattedToday,
                eventStatus: 'Chưa bắt đầu'
            },
            {
                id: 2,
                timeStart: '08:00',
                timeEnd: '16:30',
                eventName: 'Làm việc',
                eventDate: formattedToday,
                eventStatus: 'Chưa bắt đầu'
            },
            {
                id: 3,
                timeStart: '16:30',
                timeEnd: '17:00',
                eventName: 'Chạy bộ',
                eventDate: formattedToday,
                eventStatus: 'Chưa bắt đầu'
            },
            {
                id: 4,
                timeStart: '17:00',
                timeEnd: '18:00',
                eventName: 'Ăn trưa & nghỉ ngơi',
                eventDate: formattedToday,
                eventStatus: 'Chưa bắt đầu'
            },
            {
                id: 5,
                timeStart: '18:00',
                timeEnd: '22:00',
                eventName: 'Chạy SM xanh',
                eventDate: formattedToday,
                eventStatus: 'Chưa bắt đầu'
            },
            {
                id: 6,
                timeStart: '22:30',
                timeEnd: '00:00',
                eventName: 'Nghỉ ngơi',
                eventDate: formattedToday,
                eventStatus: 'Chưa bắt đầu'
            }
        ];
        
        events = sampleEvents;
        saveEvents();
        
        // Cập nhật lịch sử hoạt động từ dữ liệu mẫu
        activityHistory.firstDate = formattedToday;
        activityHistory.lastDate = formattedToday;
        activityHistory.activeDates = [formattedToday];
        activityHistory.completedActivities = events.filter(event => event.eventStatus === 'Đã hoàn thành').length;
        saveActivityHistory();
        
        loadEvents();
        updateHistoryDisplay();
        updateDateDropdown();
        currentDateView = formattedToday;
        selectDate.value = currentDateView;
    }

    function addEventToTable(event) {
        const row = document.createElement('tr');
        
        // Tạo cột thời gian
        const timeCell = document.createElement('td');
        timeCell.textContent = `${event.timeStart} – ${event.timeEnd}`;
        
        // Tạo cột hoạt động
        const nameCell = document.createElement('td');
        nameCell.textContent = event.eventName;
        
        // Tạo cột ngày
        const dateCell = document.createElement('td');
        dateCell.textContent = event.eventDate;
        
        // Tạo cột trạng thái với biểu tượng và màu tương ứng
        const statusCell = document.createElement('td');
        const statusSpan = document.createElement('span');
        let displayStatus = event.eventStatus;
        // Nếu là ngày hôm nay và chưa hoàn thành, kiểm tra giờ để hiển thị 'Đang thực hiện'
        const todayVN = getVietnamTime();
        const [day, month, year] = event.eventDate.split('/');
        const todayStr = `${day}/${month}/${year}`;
        const isToday = todayVN.getDate().toString().padStart(2, '0') === day &&
                        (todayVN.getMonth() + 1).toString().padStart(2, '0') === month &&
                        todayVN.getFullYear().toString() === year;
        if (isToday && event.eventStatus !== 'Đã hoàn thành') {
            // So sánh giờ
            const [startH, startM] = event.timeStart.split(':').map(Number);
            const [endH, endM] = event.timeEnd.split(':').map(Number);
            const start = new Date(todayVN);
            start.setHours(startH, startM, 0, 0);
            const end = new Date(todayVN);
            end.setHours(endH, endM, 0, 0);
            // Nếu timeEnd < timeStart (qua ngày), cộng thêm 1 ngày cho end
            if (end < start) end.setDate(end.getDate() + 1);
            if (todayVN >= start && todayVN <= end) {
                displayStatus = 'Đang thực hiện';
            }
        }
        statusSpan.textContent = displayStatus;
        statusSpan.className = 'status';
        if (displayStatus === 'Đã hoàn thành') {
            statusSpan.classList.add('completed');
            statusSpan.innerHTML = '✓ ' + displayStatus;
        } else if (displayStatus === 'Đang thực hiện') {
            statusSpan.classList.add('in-progress');
            statusSpan.innerHTML = '⏳ ' + displayStatus;
        } else {
            statusSpan.classList.add('not-started');
            statusSpan.innerHTML = '⏸ ' + displayStatus;
        }
        statusCell.appendChild(statusSpan);
        
        // Tạo cột thao tác
        const actionCell = document.createElement('td');
        
        // Nút chỉnh sửa
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Sửa';
        editBtn.className = 'action-btn edit-btn';
        editBtn.addEventListener('click', function() {
            openEditModal(event.id);
        });
        
        // Nút xóa
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Xóa';
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.addEventListener('click', function() {
            deleteEvent(event.id);
        });
        
        actionCell.appendChild(editBtn);
        actionCell.appendChild(deleteBtn);
        
        // Thêm tất cả các cột vào hàng
        row.appendChild(timeCell);
        row.appendChild(nameCell);
        row.appendChild(dateCell);
        row.appendChild(statusCell);
        row.appendChild(actionCell);
        
        // Thêm hàng vào bảng
        eventsBody.appendChild(row);
    }
}); 