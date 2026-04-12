/**
 * autofill.js - Smart Form Population
 * JDCOEM Student Portal
 * Automatically populates form fields with user profile data.
 */

(function() {
    console.log("Smart Auto-fill active...");

    document.addEventListener('DOMContentLoaded', function() {
        const rawUser = localStorage.getItem('user');
        if (!rawUser) return;

        let user = {};
        try {
            user = JSON.parse(rawUser);
        } catch (e) { return; }

        // Field Mapping Map: [HTML Name/ID] -> [User Property]
        const mapping = {
            'full_name': 'name',
            'fullName': 'name',
            'studentName': 'name',
            'sName': 'name',
            'name': 'name',
            'email': 'email',
            'email_id': 'email',
            'emailId': 'email',
            'sEmail': 'email',
            'btid': 'btid',
            'bt_id': 'btid',
            'btId': 'btid',
            'sBtid': 'btid',
            'roll_no': 'btid',
            'rollNumber': 'btid',
            'mobile': 'mobile',
            'phone': 'mobile',
            'phone_number': 'mobile',
            'branch': 'branch',
            'department': 'branch',
            'dept': 'branch',
            'sBranch': 'branch',
            'programme': 'programme',
            'year': 'year',
            'sYear': 'year',
            'semester': 'semester',
            'sem': 'semester',
            'yearSem': 'yearSem',
            'address': 'address'
        };

        // Extra Logic: Create yearSem if needed
        if (user.year && user.semester) {
            user.yearSem = `${user.year} / Sem ${user.semester}`;
        }

        // Populate fields by name or id
        Object.keys(mapping).forEach(fieldKey => {
            const userProp = mapping[fieldKey];
            const value = user[userProp];

            if (value && value !== '—' && value !== 'Not set') {
                // Try finding by ID
                const elById = document.getElementById(fieldKey);
                if (elById && !elById.value) {
                    elById.value = value;
                    console.log(`Auto-filled ID: ${fieldKey}`);
                }

                // Try finding by Name
                const elsByName = document.getElementsByName(fieldKey);
                elsByName.forEach(el => {
                    if (!el.value) {
                        el.value = value;
                        console.log(`Auto-filled Name: ${fieldKey}`);
                    }
                });
            }
        });
    });
})();
