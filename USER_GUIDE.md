# User Guide

## Purpose and safety notice

Skin Lesion Referral is a workflow prototype for submitting, reviewing, and tracking lesion referrals. It generates a rule-based triage score and draft referral letter.

The scoring system is **not a validated diagnostic or clinical tool**. It is not a substitute for clinical judgement, examination, or local urgent referral pathways. Before using the application with real patient data, obtain the required clinical, privacy, security, and governance approvals.

## Sign in

1. Open the application.
2. Enter your email address and password.
3. Select **Sign in**.

You are returned to the referral list. Select **Sign out** in the top-right corner when finished.

For a local Docker demonstration, the seeded accounts use the password from `DEMO_PASSWORD`:

| Account | Role |
| --- | --- |
| `referrer@example.com` | Referrer |
| `specialist@example.com` | Specialist |
| `admin@example.com` | Admin |

Demo seeding must be enabled by setting `SEED_DEMO_USERS=true` and is disabled in production. If sign-in fails, check that you are using the correct account and environment.

## Roles

### Referrer

Referrers can:

- Create referrals
- View only their own referrals
- Cancel a referral while it is submitted or under review

### Specialist

Specialists can:

- View all referrals
- Start a submitted referral for review
- Accept or reject a referral under review
- Mark an accepted referral as completed

### Admin

Admins have all referrer and specialist capabilities. Admins can also cancel referrals that are submitted or under review.

## Referral list

The home page displays referrals available to your role.

- Referrer accounts see the page heading **My referrals**.
- Specialist and admin accounts see **Referrals**.
- Use the **Status** filter to show all referrals or a specific status.
- Select a patient name to open the referral details.
- Select **New referral** to create a referral. This button is available only to referrers and admins.

The list shows the patient name, lesion site, priority, status, and creation date.

## Create a referral

Select **New referral**, then complete the form:

1. Enter the **patient name**.
2. Enter the **patient age** from 0 to 120.
3. Enter the **lesion site**.
4. Choose a **JPEG or PNG lesion photo**.
5. Check each applicable feature:
   - Asymmetry
   - Irregular border
   - Colour variation
   - Diameter over 6mm
   - Evolving or changing
   - Bleeding or ulcerated
   - Family history of melanoma
6. Add optional notes of up to 1000 characters.
7. Select **Assess & generate letter**.

### Photo requirements

- Accepted formats: JPEG or PNG
- Maximum size: 8 MB
- The photo is used to create the referral result but is not stored by the application

If the submission is interrupted or retried, the application safely reuses the same submission key while the form payload is unchanged. Editing the form creates a new submission key.

## Read a referral

The referral detail page shows:

- Patient name
- Calculated priority
- Calculated heuristic score
- Referral status
- Referrer name
- Lesion site
- Allowed status actions
- Generated draft referral letter

The priority is displayed as **urgent**, **soon**, or **routine**.

The underlying score is a prototype heuristic based on the selected features and age. It is displayed from 0 to 1 and should never be treated as a diagnosis or a validated risk estimate.

The draft letter includes the selected features, calculated score, model name, image details, and optional notes. Select **Copy letter** to copy it to the clipboard.

## Change referral status

Only actions allowed for the current role and referral state are shown.

| Current status | Available action | Who can act |
| --- | --- | --- |
| Submitted | Start review | Specialist or admin |
| Submitted | Cancel referral | Referrer who owns it or admin |
| Under review | Accept | Specialist or admin |
| Under review | Reject | Specialist or admin |
| Under review | Cancel referral | Referrer who owns it or admin |
| Accepted | Mark completed | Specialist or admin |

The final states are **Rejected**, **Completed**, and **Cancelled**. No further status action is available from those states.

## Privacy and handling

Use only the data and images authorised for your role and environment. Do not enter real patient data in a demonstration or development deployment.

The application currently:

- Uses an HTTP-only session cookie
- Stores referral records in MySQL
- Does not store uploaded images
- Does not include a password-reset or user-management interface
- Does not provide an audit history of status changes

These limitations mean additional controls are required before clinical or production use.

## Troubleshooting

- **Sign-in is rejected:** Verify the email, password, and whether demo users are seeded in this environment.
- **New referral is unavailable:** The account must be a referrer or admin.
- **Status button is unavailable:** The referral may be in a final state, or your role may not be allowed to perform that transition.
- **Photo is rejected:** Use JPEG or PNG and keep the file at or below 8 MB.
- **Referral is missing:** Referrers can view only referrals they created. Specialists and admins can view all referrals.
- **Session ends unexpectedly:** Sign in again. Expired or revoked sessions return you to the sign-in page.
