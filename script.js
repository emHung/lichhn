document.addEventListener('DOMContentLoaded', function() {
    // Thêm code này vào đầu hàm
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authContainer = document.getElementById('authContainer');
    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');
    
    // Kiểm tra trạng thái đăng nhập
    window.firebaseApp.onAuthChanged(window.firebaseApp.auth, (user) => {
        if (user) {
            // Người dùng đã đăng nhập
            authContainer.style.display = 'none';
            userInfo.style.display = 'block';
            userEmail.textContent = user.email;
            
            // Tải dữ liệu từ Firebase
            loadEvents();
            
            // Tải dữ liệu ví
            const walletRef = window.firebaseApp.dbRef(window.firebaseApp.database, 'users/' + user.uid + '/wallet');
            window.firebaseApp.dbGet(walletRef)
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        walletBalance = snapshot.val();
                        updateWalletDisplay();
                    }
                });
            
            // Tải lịch sử hoạt động
            const historyRef = window.firebaseApp.dbRef(window.firebaseApp.database, 'users/' + user.uid + '/activityHistory');
            window.firebaseApp.dbGet(historyRef)
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        activityHistory = snapshot.val();
                        updateHistoryDisplay();
                    }
                });
        } else {
            // Người dùng chưa đăng nhập
            authContainer.style.display = 'block';
            userInfo.style.display = 'none';
            
            // Tải dữ liệu từ localStorage
            events = JSON.parse(localStorage.getItem('events')) || [];
            walletBalance = parseInt(localStorage.getItem('walletBalance')) || 0;
            activityHistory = JSON.parse(localStorage.getItem('activityHistory')) || {
                firstDate: null,
                lastDate: null,
                activeDates: [],
                completedActivities: 0
            };
            
            loadEvents();
            updateWalletDisplay();
            updateHistoryDisplay();
        }
    });
    
    // Xử lý đăng nhập
    loginBtn.addEventListener('click', function() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        loginUser(email, password);
    });
    
    // Xử lý đăng ký
    registerBtn.addEventListener('click', function() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        registerUser(email, password);
    });
    
    // Xử lý đăng xuất
    logoutBtn.addEventListener('click', function() {
        window.firebaseApp.auth.signOut()
            .then(() => {
                showNotification("Đã đăng xuất thành công!");
            });
    });
    
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
        const user = window.firebaseApp.auth.currentUser;
        if (user) {
            const userId = user.uid;
            const walletRef = window.firebaseApp.dbRef(window.firebaseApp.database, 'users/' + userId + '/wallet');
            
            window.firebaseApp.dbGet(walletRef)
                .then((snapshot) => {
                    const currentBalance = snapshot.exists() ? snapshot.val() : 0;
                    const newBalance = currentBalance + amount;
                    
                    // Cập nhật số dư mới
                    window.firebaseApp.dbSet(walletRef, newBalance)
                        .then(() => {
                            walletBalance = newBalance;
                            updateWalletDisplay();
                            // Hiệu ứng highlight
                            walletAmountContainer.classList.add('highlight');
                            setTimeout(() => {
                                walletAmountContainer.classList.remove('highlight');
                            }, 2000);
                        });
                })
                .catch((error) => {
                    console.error("Lỗi khi cập nhật ví:", error);
                    // Xử lý cục bộ nếu có lỗi
                    walletBalance += amount;
                    localStorage.setItem('walletBalance', walletBalance);
                    updateWalletDisplay();
                });
        } else {
            // Xử lý cục bộ nếu chưa đăng nhập
            walletBalance += amount;
            localStorage.setItem('walletBalance', walletBalance);
            updateWalletDisplay();
            
            // Hiệu ứng highlight
            walletAmountContainer.classList.add('highlight');
            setTimeout(() => {
                walletAmountContainer.classList.remove('highlight');
            }, 2000);
        }
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
        const user = window.firebaseApp.auth.currentUser;
        if (user) {
            const userId = user.uid;
            const historyRef = window.firebaseApp.dbRef(window.firebaseApp.database, 'users/' + userId + '/activityHistory');
            window.firebaseApp.dbSet(historyRef, activityHistory)
                .catch((error) => {
                    console.error("Lỗi khi lưu lịch sử:", error);
                    localStorage.setItem('activityHistory', JSON.stringify(activityHistory));
                });
        } else {
            localStorage.setItem('activityHistory', JSON.stringify(activityHistory));
        }
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
    
    // Hàm lưu sự kiện vào Firebase (thay thế hàm saveEvents hiện tại)
    function saveEvents() {
        const user = window.firebaseApp.auth.currentUser;
        if (user) {
            const userId = user.uid;
            const eventsRef = window.firebaseApp.dbRef(window.firebaseApp.database, 'users/' + userId + '/events');
            window.firebaseApp.dbSet(eventsRef, events)
                .then(() => {
                    // Lưu thành công
                })
                .catch((error) => {
                    console.error("Lỗi khi lưu sự kiện:", error);
                    // Lưu vào localStorage khi có lỗi
                    localStorage.setItem('events', JSON.stringify(events));
                });
        } else {
            // Nếu chưa đăng nhập, vẫn lưu vào localStorage
            localStorage.setItem('events', JSON.stringify(events));
        }
    }
    
    // Hàm tải sự kiện từ Firebase (thay thế hàm loadEvents hiện tại)
    function loadEvents() {
        const user = window.firebaseApp.auth.currentUser;
        if (user) {
            const userId = user.uid;
            const eventsRef = window.firebaseApp.dbRef(window.firebaseApp.database, 'users/' + userId + '/events');
            window.firebaseApp.dbGet(eventsRef)
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        events = snapshot.val() || [];
                        eventsBody.innerHTML = ''; // Xóa bảng hiện tại
                        events.forEach(event => {
                            addEventToTable(event);
                        });
                        // Cập nhật lịch sử sau khi tải sự kiện
                        updateActivityDates();
                        updateHistoryDisplay();
                    } else {
                        // Không có dữ liệu
                        events = [];
                        eventsBody.innerHTML = '';
                    }
                })
                .catch((error) => {
                    console.error("Lỗi khi tải sự kiện:", error);
                    // Tải từ localStorage khi có lỗi
                    events = JSON.parse(localStorage.getItem('events')) || [];
                    eventsBody.innerHTML = '';
                    events.forEach(event => {
                        addEventToTable(event);
                    });
                });
        } else {
            // Nếu chưa đăng nhập, vẫn tải từ localStorage
            events = JSON.parse(localStorage.getItem('events')) || [];
            eventsBody.innerHTML = '';
            events.forEach(event => {
                addEventToTable(event);
            });
        }
    }
    
    // Hàm thêm sự kiện vào bảng
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
        statusSpan.textContent = event.eventStatus;
        statusSpan.className = 'status';
        
        // Thêm class theo trạng thái
        if (event.eventStatus === 'Đã hoàn thành') {
            statusSpan.classList.add('completed');
            statusSpan.innerHTML = '✓ ' + event.eventStatus;
        } else if (event.eventStatus === 'Đang thực hiện') {
            statusSpan.classList.add('in-progress');
            statusSpan.innerHTML = '⏳ ' + event.eventStatus;
        } else {
            statusSpan.classList.add('not-started');
            statusSpan.innerHTML = '⏸ ' + event.eventStatus;
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
    
    // Hàm định dạng ngày
    function formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    }
    
    // Hàm lấy ngày hiện tại (định dạng dd/mm/yyyy)
    function getCurrentDate() {
        const today = new Date();
        const day = today.getDate().toString().padStart(2, '0');
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const year = today.getFullYear();
        
        return `${day}/${month}/${year}`;
    }
    
    // Hàm tự động điền ngày hiện tại
    function setTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        
        document.getElementById('eventDate').value = `${year}-${month}-${day}`;
    }
    
    // Hàm kiểm tra xem tất cả sự kiện đã hoàn thành chưa
    function checkIfAllCompleted() {
        if (events.length === 0) return false;
        
        return events.every(event => event.eventStatus === 'Đã hoàn thành');
    }
    
    // Hàm kiểm tra và hiển thị thông báo nếu tất cả sự kiện đã hoàn thành
    function checkAllCompleted() {
        if (checkIfAllCompleted()) {
            showReward();
        }
    }

    // Khi tải ứng dụng lần đầu, cập nhật lịch sử hoạt động từ sự kiện hiện có
    if (events.length > 0 && (!activityHistory.firstDate || activityHistory.activeDates.length === 0)) {
        updateActivityDates();
        saveActivityHistory();
        updateHistoryDisplay();
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
                timeStart: '07:00',
                timeEnd: '08:00',
                eventName: 'Thức dậy & Ăn sáng',
                eventDate: formattedToday,
                eventStatus: 'Đã hoàn thành'
            },
            {
                id: 2,
                timeStart: '08:00',
                timeEnd: '10:00',
                eventName: 'Làm việc dự án LumiMind',
                eventDate: formattedToday,
                eventStatus: 'Đã hoàn thành'
            },
            {
                id: 3,
                timeStart: '10:00',
                timeEnd: '10:30',
                eventName: 'Nghỉ ngơi',
                eventDate: formattedToday,
                eventStatus: 'Đang thực hiện'
            },
            {
                id: 4,
                timeStart: '10:30',
                timeEnd: '12:00',
                eventName: 'Viết kế hoạch kinh doanh',
                eventDate: formattedToday,
                eventStatus: 'Đang thực hiện'
            },
            {
                id: 5,
                timeStart: '12:00',
                timeEnd: '13:00',
                eventName: 'Ăn trưa & nghỉ trưa',
                eventDate: formattedToday,
                eventStatus: 'Chưa bắt đầu'
            },
            {
                id: 6,
                timeStart: '13:00',
                timeEnd: '15:00',
                eventName: 'Họp nhóm',
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
    }
}); 