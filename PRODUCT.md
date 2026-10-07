# PRODUCT.md

## 1. The job
When the doctor needs my past health records, I want to share a one-page summary of my health history, so I can avoid repeated visits to the doctor.
Who, by situation: This is for anyone whose reports are spread across years and places, now at a doctor for something that isn't going away. 
Today they hire: Right now, I usually take the most recent report and the doctor will ask for more relevant reports for further diagnosis and I will have to come for the next visit. Also, the doctor will manually piece together this information in the reports to make sense.

## 2. The switch
What they'd fire: Today, the doctor gets either the most recent health report or nothing even if they have an ailment which is not going away.  
Push: In most cases, the doctor would advise them to come back again with all the relevant reports -> the 1 page health summary could avoid this re-visit.
Pull: A visual health summary the doctor can read in 2 minutes. 
Anxiety: Will the doctor trust the health summary? -> the product has the link on the summary page to the reports for validation and building trust.
Habit: Its easy to grab the latest report and visit the doctor. -> the quick upload of all relevant reports and the required summary would take less than 5 min.
How I know: from personal experience. When I shared all the reports from the past (though she still had to piece together the information), she was able to make the right diagnosis.
The one worry onboarding must remove: will the doctor trust the summary?


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
3) The product compares the tests from at-least 2 uploaded reports with the help of health-marker visuals and trend-lines.
4) upon doctor's visit, I share the summary withe doctor
5) The doctor gets the relevant history and trends in ~2 minutes, and can open the source reports when needed.

Things it takes to get the job done today: 8 · With my product: 5

What must not happen:
1) Putting a wrong report for the AI analysis (as shown in Step 3: With my product)
2) AI acts like doctor and calls out diagnosis (it only helps the doctor with stats and trendiness)
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
Does: prepares health summary comparing the blood reports across at least 2 different dates. It will have visual cues and trend-lines. It will share "View Original Report" link under each value. Moreover, it will also flag non-medical reports or reports which can't be compared.
Doesn't: diagnose the medical reports to act like doctors
Nice to have (only after the must haves work): access the mail for historical or present health records and prescriptions (only after sign-up)
How I'll know it worked: they will be uploading more reports.

## 6. The riskiest guess
If this is false, the product is pointless: The AI has to accurately recognise the same test even when two labs give it different names.
Thirty-minute check, no code (run it while you build), and what happened: I uploaded my March and September 2025 blood reports to ChatGPT. WBC and CRP came through correctly. But in the Heart & cholesterol block, CHOLESTEROL -LDL and LDL CHOLESTEROL are the same test, and ChatGPT read them as different tests. So v1 must thoroughly check the test names and check if it's the same test or not and then correctly add it for summary and analysis across different dates.

## 7. Milestones
1. I can upload all kinds of reports in pdf and image formats.
2. I can upload 2 or more blood reports, then see LDL from both shown as one report.
3. I can flag a file which isn't a medical report.
4. I can create simple to understand health summary based on the required check-ups and share it with the doctor.
5. I can view the original report from the link in the summary page to ensure there is no error.
6. I can enable sign-in after the user has tried the link and sees the first summary.
7. Last: I can close it, reopen it, and my data is still there. 



