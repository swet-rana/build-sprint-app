# PRODUCT.md

## 1. The job
When the doctor needs my past health records, I want to share a one-page summary of my health history, so the doctor can make a proper and fast diagnosis.
Who, by situation: This is for anyone whose reports are spread across years and places, now at a doctor for something that isn't going away. 
Today they hire: Right now, I usually take the most recent report and the doctor will ask for more relevant reports for further diagnosis and I will have to come for the next visit. Also, the doctor will manually piece together this information in the reports to make sense.

## 2. The switch
What they'd fire: Today, the doctor gets either the most recent health report or nothing even if they have an ailment which is not going away.  
Push: In most cases, the doctor would advise them to come back again with all the relevant reports.
Pull: A visual health summary the doctor can read in 2 minutes. 
Anxiety: Will the doctor trust the health summary?
Habit: Its easy to grab the latest report and visit the doctor.
How I know: from personal experience. When I shared all the reports from the past (though she still had to piece together the information), she was able to make the right diagnosis.
The one worry onboarding must remove: will the doctor appreciate the summary?


## 3. The core flow

Today (what they do now, before your product):
1) I have a health issue that needs further diagnosis.
2) I Visit the Doctor
3) Doctor asks for all relevant reports
4) I probably will have a few but not all the necessary ones if the ailment needs further diagnosis
5) I seek another appointment
6) Spend substantial amount of time getting all the relevant reports (check mails, apps, offline documents)
7) Upon the next visit, the doctor sees all the reports and try to make sense out of it- again spends a lot of time
8) The doctor shares the diagnosis and next steps 

With my product:
The story: I want to give my doctor the relevant context from my entire health history without searching through years of reports.
1) I have a health issue that needs further diagnosis.
2) I prepare by opening the product, adding any missing recent reports, and ask it to prepare my history for this visit.
3) I inform the product about the reason for visit. The product finds relevant past reports, pasts diagnoses written in their reports and prepares health-marker visuals and trend-lines.
4) upon doctor's visit, I share the summary withe doctor
5) The doctor gets the relevant history and trends in ~2 minutes, and can open the source reports when needed.

Things it takes to get the job done today: 8 · With my product: 5

What must not happen:
1) Putting a wrong report for the AI analysis (as shown in Step 3: With my product)
2) AI acts like a doctor, suggests a diagnosis, or labels changes as health improving or worsening. It only shows measured changes, units, and each report's reference ranges; the doctor interprets them.
3) the product misreading the uploaded or scanned reports

## 4. Onboarding
The smallest commitment we ask for:
Please share at least 2 blood test reports from different dates. 
First Value:
In Sep 2025 report, the WBC and CRP were elevated- 12400/ul & 18.6 mg/L compared with the patient's March report showing 7200/ul & 2.1 mg/L. It also highlights the range for WBC (4000- 11000) and CRP (0-5)
Under each value, there is the link to the original report.
The worry it removes:
Will the doctor trust the health summary?


From opening the link to the first value:
1. Open the link received on mail or WhatsApp
2. Upload at least 2 blood tests reports from different dates
3. The app shows the comparative summary (First Value)
4. The user checks the reports by clicking the link near the values (The worry it removes - "Will the doctor trust the health summary")
5. Later- store your reports for future reference by just a simple mail/number sign in.

Login: after step 4, because we need to build trust the report is accurate
What we don't ask on day one: user profile, mail access to scan reports 
What we ask later, and when: to do a mail/phone sign in to save all your reports and have access to more summaries.

## 5. v1
Does: prepares health summary comparing the blood reports across at least 2 different dates. It will have visual cues and trend-lines showing measured changes, with units and the reference ranges printed in each report. It will share "View Original Report" link under each value. Moreover, it will also flag non-medical reports or reports which can't be compared.
Doesn't: suggest diagnoses or label measured changes as health improving or worsening. Interpretation belongs to the doctor.
Nice to have (only after the must haves work): access the mail for historical or present health records and prescriptions (only after sign-up)
How I'll know it worked: they will be uploading more reports and maybe share the reason for doing that.

