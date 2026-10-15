# DESIGN.md
Read this before building or changing any screen. If a choice isn't covered here, ask me instead of guessing.

## 1. The feeling, in labels

1) the red dot of summary is what shows why this report is so important. It is the value which sits outside the lab's range and the doctor needs to talk about it.
2) the  ailment service block in the summary page has the visual images and the number of tests which helps the doctor to get customised views.
3) the trend-line is what the user is paying for. I have enriched it with summary and dots for visual clarity
4) The report blocks are large enough (16px or more) with clear texts, so anyone can read it easily. It also gives the option to open original report.
5) the homepage should have 1 job of explaining what can be done and then directing to the respective actions. The 'Begin now' button in the homepage takes you toward your 1st activity I.e to upload your reports.



 ## 2. References, one per component

Service block: /Users/swetrana/build-sprint-app/reference/EkaServiceCard
Take: health service cards, clickable cards moves to tests values which are selected. Inspired from Eka Care.
Ignore: Font size and colour, red dots and concerns in red

Trend-line: /Users/swetrana/build-sprint-app/reference/trendline
Take: red and green dots stand out-need to use them. Even the trend line looks simple and elegant, use it for analysis design. Inspired from Google fit and Apple health
Ignore: the numbering of biomarkers

Report block: /Users/swetrana/build-sprint-app/reference/report design reference
Take: font style and design, background theme, block representing report date, got other report button, 
Ignore: move to summary page within report block


Logo: /Users/swetrana/build-sprint-app/reference/HealthStats Logo
Take: Logo shape and font style
Ignore: Font colour


How ## 3. Type and colour
Preserve the existing HealthStats logo, using Poppins Bold (700) for “Health” and Poppins Regular (400) for “Stats” if the logo is rendered as text. 
Use Inter for all headings, navigation elements, and buttons, and Inter for body text, medical information, biomarker values, and descriptions to ensure excellent readability. 
 For colours, maintain the existing deep, premium purple (#342C91) for primary headings, important labels, and key interface elements, complemented by a muted purple-grey (#66668A) for descriptions and secondary text.
Use a clean, soft off-white background (#FAF9FF) with  with lavender accents (#E9E4FF) on service cards, report blocks and action blocks.
Red dot is glossy sphere style in crimson (about #B02A3A) in colour. It is used to flag that the value is out of range. Green dot is Medium green (about #3E9B4F). It indicates values which is within range. next to each dot, add an arrow (↑ above range values  & ↓ below range values besides red dot and a ✓ for green dot). Each dot is 25 px.

Sizes (Inter, smaller on phones, never over two lines):
- Header: 40px in desktop/laptop, 30px in mobile for page titles like My reports, My summary etc
- Sub-header: 30px, in desktop/laptop, 24px in mobile for sub-headings explaining page titles.
- Line item: 22px in desktop/laptop, 20px in mobile (buttons use this too) for service card texts, report block texts
- Legend: 14px, in desktop/laptop, 13px in  mobile for graph scales and legends.


## 4. Screens
A)  Home page
1) Shows the minimum steps to get the health summary done through a simple 12 sec animation. Click the 'Show tutorial' button to implement that.
2) There are 4 steps shown through a 3 sec animation for each step
3) Whenever the first-time user opens the link- the 4 step animation plays by default. 
4) The animation plays by default only for the first time and the 2nd visit onwards should just show the homepage
5) Each of the 4 step animation is prepared using simple graphics showing documents, tick marks, upload and prepare summary button images.
6) There is a Call-to-Action button called 'Begin Now' which the user can click to go to the 1st step that is the Reports tab.
7) The user should understand that 'begin now' initiates the 1st step that is 'to upload the required report'  as shown in the tutorial'
8) The bottom section (OR THE ACTION BAR) of the homepage has all the 4 sections- Home, Reports, Summary, profile.
9) The actual logo (HealthStats) is displayed on the top-let and is shown through a GIF with the horizontal var of 'H'moves up tilted followed by the appearance of 3 dots, red, purple & green- conveying the essence.
10) The HealthStats logo in GIF format should come out when the  animation loads. If there is an error and the animation doesn't load. Skip straight to the homepage with Begin Now still visible.
B) Reports Page
1) the report page is opened through 2 option- 1) 'Begin now' button in home page and 'Reports' button in action bar across all pages.  
2) There is an 'upload report' button on the top right to upload reports (original pdfs, scanned pdfs and images).
5) Once, the reports are uploaded, they should appear as report blocks to indicate type of the report, name of the lab, name of the person, date of report and size of the report.
6) the report block should also have a checkbox to tick which indicates that the report is available to prepare summary.
7) There should be a search bar to find and shortlist reports.
8) there should be a provision to select report type- blood reports, prescriptions, visuals (X-rays, MRI, ultrasound etc)
9) There should be a provision to arrange reports by upload date  and report date
10) This page should also call out the total reports saved and how much can be uploaded for analysis.
11) a final call-out to indicate that reports can only be saved if signed in but analysis is possible without sign-up.
12) Selecting 2 or more reports will bring-up CTA button- move to summary page.
13) the summary page will show the ticked reports and a prepare summary button.
14) on clicking the prepare summary button, it should glide to 'Browse by health category' section.
15) on clicking the respective service cards, it should glide to Choose tests for your summary.
16) the reports which are prepared for summary, should be simple and should be shown through trend-lines with test values and test dates.
14) If a report value is below or above the lab's reference range, it should be marked as red dot.
15) there should be a 3 line summary below each of the trend-lines indicating - value increased or decreased by, date-range and what is the impact of latest value.


## 5. The first screen's words
Headline: [the outcome, in your user's words]
Under it: [how it works, and who it's for]
Button: [what happens when they tap]

## 6. Principles
- [a rule that holds on every screen]