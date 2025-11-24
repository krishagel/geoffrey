#!/usr/bin/env osascript -l JavaScript
// Add contact to iCloud Contacts
// Usage: osascript -l JavaScript add_contact.js '{"name": "First Last", "phone": "123-456-7890", "email": "email@example.com", "organization": "Company"}'
//
// All fields except name are optional

function run(argv) {
    if (argv.length === 0) {
        return JSON.stringify({
            error: "Missing parameters",
            usage: 'osascript -l JavaScript add_contact.js \'{"name":"...", "phone":"...", "email":"..."}\''
        });
    }

    let params;
    try {
        params = JSON.parse(argv[0]);
    } catch (e) {
        return JSON.stringify({
            error: "Invalid JSON",
            details: e.message
        });
    }

    if (!params.name) {
        return JSON.stringify({ error: "Missing name parameter" });
    }

    // Parse name into first/last
    let nameParts = params.name.trim().split(/\s+/);
    let firstName = nameParts[0] || "";
    let lastName = nameParts.slice(1).join(" ") || "";

    const Contacts = Application("Contacts");

    try {
        // Create new person
        let person = Contacts.Person({
            firstName: firstName,
            lastName: lastName
        });

        // Add to contacts
        Contacts.people.push(person);

        // Add phone if provided
        if (params.phone) {
            let phone = Contacts.Phone({
                label: "work",
                value: params.phone.replace(/[^\d+()-\s]/g, "")
            });
            person.phones.push(phone);
        }

        // Add email if provided
        if (params.email) {
            let email = Contacts.Email({
                label: "work",
                value: params.email
            });
            person.emails.push(email);
        }

        // Add organization if provided
        if (params.organization) {
            person.organization = params.organization;
        }

        // Add note if provided
        if (params.note) {
            person.note = params.note;
        }

        // Save
        Contacts.save();

        return JSON.stringify({
            success: true,
            contact: {
                firstName: firstName,
                lastName: lastName,
                phone: params.phone || null,
                email: params.email || null,
                organization: params.organization || null
            }
        });

    } catch (e) {
        return JSON.stringify({
            error: "Failed to create contact",
            details: e.message
        });
    }
}
