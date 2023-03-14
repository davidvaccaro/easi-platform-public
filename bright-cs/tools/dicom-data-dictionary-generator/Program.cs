//
// DicomDataDictionaryGenerator.cs - 1.0.0
//
// DICOM Dictionary Generator Class 
//
// Proprietary Notices:
// The Products, Documentation and Materials are proprietary to Xinonix Interactive Development Inc. and its licensors 
// and protected by applicable U.S. and international patent, copyright, trademark and trade secret laws. Xinonix 
// Interactive Development Inc and its licensors shall retain ownership in the Products, Documentation and Materials; 
// all derivatives thereof (in whole or part); and any intellectual property or other rights embodied therein. 
// 
// All proprietary notices incorporated in or affixed to any Products, Documentation or Materials shall be duplicated 
// by you on all copies of the Products, Documentation, or Material, as applicable, and shall not be altered, removed 
// or obliterated. Lease Equipment is, and shall at all times be and remain Our sole and exclusive property; you have 
// no right, title or interest therein or thereto except as expressly set forth in this Agreement. You shall keep the 
// Lease Equipment free and clear of all levies, liens and encumbrances and shall immediately notify us in writing of 
// any circumstances with respect to the location of the Equipment which will adversely affect it or our security 
// interests therein. You shall not install, attach, mount or otherwise house the Lease Equipment in a manner that 
// would render it a fixture under applicable law within the jurisdiction in which the Lease Equipment is located.
//

using System;
using System.Collections;
using System.Net;
using System.Reflection.Emit;
using System.Text;
using System.Xml.Linq;

namespace Xinonix.Dicom.Tools
{

    /**
     * Generates ALL DICOM data-dictionary items for all languages from the NEMA original Part-06 XML source.
     */
    class DicomDataDictionaryGenerator {

        #region General Utilities

        public static string cleanString(string input)
        {
            return new string(input.Where(c => !char.IsControl(c) && (char.IsLetterOrDigit(c) || char.IsPunctuation(c) || char.IsSeparator(c) || char.IsSymbol(c) || char.IsWhiteSpace(c))).ToArray());
        }

        #endregion

        #region Raw DICOM Part-06 Dictionary Member Functions

        /**
         * Fetch the current DICOM data-dictionary right from the source.
         */
        async static public Task<XDocument?> fetchDataDictionary()
        {

            // Get the current environment root
            string? rootPath = Environment.GetEnvironmentVariable("BRIGHT_ROOT");

            if ((rootPath == null) || (rootPath.Trim() == string.Empty))
            {

                // Report to the caller
                Console.WriteLine("No BRIGHT_ROOT Environment Variable!");

                return null;
            }

            // Create a new HTTP client
            HttpClient httpClient = new HttpClient();

            // Get the DICOM Part-06 data dictionary
            Stream stream = await httpClient.GetStreamAsync("https://dicom.nema.org/medical/dicom/current/source/docbook/part06/part06.xml");

            // Load the document
            XDocument document = XDocument.Load(stream);
        
            // Save the XML document to the dictionary location
            document.Save(System.IO.Path.Combine(rootPath, "data", "dictionaries", "part06.xml"));

            // Return the document
            return document;

        }

        /**
         * Find the DICOM data-dictionary "chapter"
         */
        public static XElement? findDataDictionaryChapter(XDocument dictionary, string chapterID)
        {

            // Find the data-element portion of the data dictionary
            IEnumerable<XElement>? chapters = dictionary.Root.Elements().Where(x => x.Name.LocalName == "chapter");

            if (chapters == null)
            {

                // Report to the caller
                Console.WriteLine("No DICOM Dictionary Chapters!");

                return null;

            }

            // Loop over the chapters
            foreach (XElement chapter in chapters)
            {

                if (chapter.Attributes().Where(x => x.Name.LocalName == "id" && x.Value == chapterID).FirstOrDefault() != null)
                    return chapter;

            }

            // The chapter was NOT found
            return null;

        }

        #endregion

        #region Generic Dictionary Generation Member Functions

        /**
         * Regenerate the latest version of all generic (CSV) data-element for the specified table.
         */
        public static void generateGenericDataElementTable(XElement? table, StringBuilder sb)
        {

            // Find the table header
            XElement? header = table.Elements().Where(x => x.Name.LocalName == "thead").FirstOrDefault();

            // Find the table body
            XElement? body = table.Elements().Where(x => x.Name.LocalName == "tbody").FirstOrDefault();

            // Loop over the body rows
            foreach (XElement row in body.Elements().Where(x => x.Name.LocalName == "tr"))
            {

                // Find the list of "td" elements
                XElement[] cols = row.Elements().Where(x => x.Name.LocalName == "td").ToArray();

                // Parse the "Tag"
                String tag = cleanString(cols[0].Value);

                // Parse the "Name"
                String name = cleanString(cols[1].Value.Replace(",", string.Empty).Trim());

                // Parse the "Keyword"
                String keyword = cleanString(cols[2].Value.Replace(",", string.Empty).Trim());

                // Parse the "VR"
                String vr = cleanString(cols[3].Value.Replace(",", string.Empty).Trim());

                // Parse the "VM"
                String vm = cleanString(cols[4].Value.Replace(",", string.Empty).Trim());

                // Parse the "VM"
                String retired = cleanString(cols[5].Value);

                // Parse the tag to determine the "group" and "element"
                string[] tagParts = tag.Replace("(", string.Empty).Replace(")", string.Empty).Trim().Split(new char[] { ',' });

                // Establish the "group" (hex) code
                string groupCode = tagParts[0].Trim();

                // Establish the "element" (hex) code
                string elementCode = tagParts[1].Trim();

                // Establish the "group" value
                int group = (groupCode.Contains("x") == false) ? Convert.ToInt32(groupCode, 16) : -1;

                // Establish the "element" value
                int element = (elementCode.Contains("x") == false) ? Convert.ToInt32(elementCode, 16) : -1;

                // Determine if this is a "retired" element
                bool isRetired = ((retired.Trim() != string.Empty) && (retired.Contains("RET")));

                // Write the tag row with COLUMNS: TAG ID, GROUP, ELEMENT, GROUP VALUE, ELEMENT VALUE, NAME, KEYWORD, VR, VM, IS RETIRED 
                sb.AppendLine(groupCode + elementCode + "," + groupCode + "," + elementCode + "," + group + "," + element + "," + name + "," + keyword + "," + vr + "," + vm + "," + ((isRetired == true) ? "TRUE" : "FALSE"));

            }

        }

        /**
         * Regenerate the latest version of all generic (CSV) data-element related artifacts.
         */
        public static void generateGenericDataElementDictionaries(XDocument dictionary)
        {

            // Get the current environment root
            string? rootPath = Environment.GetEnvironmentVariable("BRIGHT_ROOT");

            if ((rootPath == null) || (rootPath.Trim() == string.Empty))
            {

                // Report to the caller
                Console.WriteLine("No BRIGHT_ROOT Environment Variable!");

                return;

            }

            // Find the "chapter_6" chapter
            XElement? chapter6 = findDataDictionaryChapter(dictionary, "chapter_6");

            if (chapter6 == null)
            {

                // Report to the caller
                Console.WriteLine("No DICOM Part-06 Table 6-1. Registry of DICOM Data Elements Chapter!");

                return;

            }

            // Find the table table
            XElement? table6 = chapter6.Elements().Where(x => x.Name.LocalName == "table").FirstOrDefault();

            if (table6 == null)
            {

                // Report to the caller
                Console.WriteLine("No DICOM Part-06 Table 6-1. Registry of DICOM Data Elements Table!");

                return;

            }

            // Find the "chapter_7" chapter
            XElement? chapter7 = findDataDictionaryChapter(dictionary, "chapter_7");

            if (chapter7 == null)
            {

                // Report to the caller
                Console.WriteLine("No DICOM Part-06 Table 7-1. Registry of DICOM File Meta Elements Chapter!");

                return;

            }

            // Find the table table
            XElement? table7 = chapter7.Elements().Where(x => x.Name.LocalName == "table").FirstOrDefault();

            if (table7 == null)
            {

                // Report to the caller
                Console.WriteLine("No DICOM Part-06 Table 7-1. Registry of DICOM File Meta Elements Table!");

                return;

            }

            // Find the "chapter_8" chapter
            XElement? chapter8 = findDataDictionaryChapter(dictionary, "chapter_8");

            if (chapter8 == null)
            {

                // Report to the caller
                Console.WriteLine("No DICOM Part-06 Table 8-1. Registry of DICOM Directory Structuring Elements Chapter!");

                return;

            }

            // Find the table table
            XElement? table8 = chapter8.Elements().Where(x => x.Name.LocalName == "table").FirstOrDefault();

            if (table8 == null)
            {

                // Report to the caller
                Console.WriteLine("No DICOM Part-06 Table 8-1. Registry of DICOM Directory Structuring Elements Table!");

                return;

            }

            // Find the "chapter_8" chapter
            XElement? chapter9 = findDataDictionaryChapter(dictionary, "chapter_9");

            if (chapter9 == null)
            {

                // Report to the caller
                Console.WriteLine("No DICOM Part-06 Table 9-1. Registry of DICOM Dynamic RTP Payload Elements Chapter!");

                return;

            }

            // Find the table table
            XElement? table9 = chapter9.Elements().Where(x => x.Name.LocalName == "table").FirstOrDefault();

            if (table9 == null)
            {

                // Report to the caller
                Console.WriteLine("No DICOM Part-06 Table 9-1. Registry of DICOM Dynamic RTP Payload Elements!");

                return;

            }

            // Create the new builder
            StringBuilder sb = new StringBuilder();

            // Write the header (TAG ID, TAG, GROUP, ELEMENT, GROUP VALUE, ELEMENT VALUE, NAME, KEYWORD, VR, VM, IS RETIRED)
            sb.AppendLine("TAG ID,GROUP,ELEMENT,GROUP VALUE,ELEMENT VALUE,NAME,KEYWORD,VR,VM,IS RETIRED");

            // Generate the Part-06 Table 7-1. Registry of DICOM File Meta Elements
            generateGenericDataElementTable(table7, sb);

            // Generate the Part-06 Table 8-1. Registry of DICOM Directory Structuring Elements
            generateGenericDataElementTable(table8, sb);

            // Generate the Part-06 Table 9-1. Registry of DICOM Dynamic RTP Payload Elements
            generateGenericDataElementTable(table9, sb);

            // Generate the Part-06 Table 6-1. Registry of DICOM Data Elements
            generateGenericDataElementTable(table6, sb);

            // Append the "Ad-Hoc" data-elements
            foreach (string line in System.IO.File.ReadAllLines(System.IO.Path.Combine(rootPath, "data", "dictionaries", "data-elements-adhoc.csv")))
            {
                if (line.Trim() != string.Empty)
                {
                    sb.AppendLine(line);
                }
            }

            // Write out the raw dictionary file
            System.IO.File.WriteAllText(System.IO.Path.Combine(rootPath, "data", "dictionaries", "data-elements.csv"), sb.ToString());

        }

        /**
         * Generate the generic (CSV) dictionaries from the DICOM Part-06 XML.
         */
        public static void generateGenericDictionaries(XDocument dictionary)
        {

            // Generate the Element Dictionaries
            generateGenericDataElementDictionaries(dictionary);

        }

        #endregion

        #region Language-specific Dictionary Generation Member Functions

        /**
         * Generate the Javascript dictionaries.
         */
        public static void generateJavascriptDictionaries()
        {

            // Get the current environment root
            string? rootPath = Environment.GetEnvironmentVariable("BRIGHT_ROOT");

            if ((rootPath == null) || (rootPath.Trim() == string.Empty))
            {

                // Report to the caller
                Console.WriteLine("No BRIGHT_ROOT Environment Variable!");

                return;

            }

            /*
             * EXAMPLE:
             * 
                var Tag = {
	                '00020000': new DicomTag({ ID: '00020000', Tag: '(0002, 0000)', Group: 2, Element: 0, VR: ValueRepresentations.UL, Name: 'File Meta Information Group Length', IsRetired: false })
                }
             * 
             * var Templates = Object.keys(Tag).find(element => element.Group == -1 || element.Element == -1);
             * 
                var Tags = {
	                FileMetaInformationGroupLength: Tag['00020000']
                }
             * 
             */

            // Read the raw data-element lines
            string[] lines = System.IO.File.ReadAllLines(System.IO.Path.Combine(rootPath, "data", "dictionaries", "data-elements.csv"));

            // Create a new string builder
            StringBuilder sb = new StringBuilder();

            // Write out the header
            sb.Append("//\n// DicomDictionaries.js - 1.0.0\n//\n// DICOM Dictionaries \n//\n// David Vaccaro, Xinonix Interactive Development, Inc / Copyright " + DateTime.Now.Year.ToString() + "\n// \n// Proprietary Notices:\n// The Products, Documentation and Materials are proprietary to Xinonix Interactive Development Inc. and its licensors \n// and protected by applicable U.S. and international patent, copyright, trademark and trade secret laws. Xinonix \n// Interactive Development Inc and its licensors shall retain ownership in the Products, Documentation and Materials; \n// all derivatives thereof (in whole or part); and any intellectual property or other rights embodied therein. \n// \n// All proprietary notices incorporated in or affixed to any Products, Documentation or Materials shall be duplicated \n// by you on all copies of the Products, Documentation, or Material, as applicable, and shall not be altered, removed \n// or obliterated. Lease Equipment is, and shall at all times be and remain Our sole and exclusive property; you have \n// no right, title or interest therein or thereto except as expressly set forth in this Agreement. You shall keep the \n// Lease Equipment free and clear of all levies, liens and encumbrances and shall immediately notify us in writing of \n// any circumstances with respect to the location of the Equipment which will adversely affect it or our security \n// interests therein. You shall not install, attach, mount or otherwise house the Lease Equipment in a manner that \n// would render it a fixture under applicable law within the jurisdiction in which the Lease Equipment is located.\n//\n//");
            sb.AppendLine(string.Empty);
            sb.AppendLine("// THIS FILE GENERATED: " + DateTime.Now.ToString());
            sb.AppendLine(string.Empty);

            #region Generate the Tag Map

            // Start the Tag map
            sb.AppendLine("var Tag = {");

            // Loop over the lines of raw data-element dictionary rows (skip the header)
            for (int i = 1; i < lines.Length; i++)
            {

                // Split the line
                string[] cols = lines[i].Split(new char[] { ',' });

                // Determine the Other VR
                string vr = string.Empty;
                string otherVR = string.Empty;

                if (cols[7].Contains(" or ") == true)
                {

                    // Split the VR
                    string[] vrParts = cols[7].Split(" or ");

                    // Set the primary VR
                    vr = vrParts[0].Trim().ToUpper();

                    // Set the other VR
                    otherVR = vrParts[1].Trim().ToUpper();

                }
                else
                {
                    vr = cols[7].Trim().ToUpper();
                }

                // Handle invalid VR values
                if (vr.Length > 2)
                {
                    vr = "NONE";
                }

                if (otherVR.Length > 2)
                {
                    otherVR = "NONE";
                }

                // Determine the VM sub-object
                string vm = string.Empty;

                // Process the VM
                if (cols[8].Contains("-") == true)
                {

                    // Split the range
                    string[] range = cols[8].Split(new char[] { '-' });

                    int min = -1;
                    int max = -1;

                    // Try to parse the integer value
                    if (int.TryParse(range[0], out min) == false)
                        min = -1;

                    // Try to parse the integer value
                    if (int.TryParse(range[1], out max) == false)
                        max = -1;

                    // Buils the VM sub-object
                    vm = "{ Min: " + min + ", Max: " + max + " }";

                }
                else
                {

                    int exact = -1;

                    // Try to parse the integer value
                    if (int.TryParse(cols[8], out exact) == false)
                        exact = -1;

                    // Buils the VM sub-object
                    vm = "{ Exact: " + exact + " }";

                }

                // Validate the line
                if (vr == string.Empty)
                    continue;

                // Append the tag line
                sb.AppendLine("\t\'" + cols[0].Trim() + "\': new DicomTag({ ID: '" + cols[0].Trim() + "', Tag: '(" + cols[1].Trim() + ", " + cols[2].Trim() + ")', Group: " + cols[3].Trim() + ", Element: " + cols[4].Trim() + ", VR: ValueRepresentations." + vr.Trim() + ", " + ((otherVR != string.Empty) ? ("VR2: ValueRepresentations." + otherVR + ",") : string.Empty) + " VM: " + vm + ", Name: '" + cols[5].Replace("'", string.Empty).Trim() + "', IsRetired: " + cols[9].Trim().ToLower() + " })" + ((i == lines.Length - 1) ? string.Empty : ","));

            }

            // End the Tag map
            sb.AppendLine("};");

            #endregion

            #region Generate the Tags Lookup Map

            // Start the Tag map
            sb.AppendLine("");
            sb.AppendLine("var Tags = {");

            // Loop over the lines of raw data-element dictionary rows (skip the header)
            for (int i = 1; i < lines.Length; i++)
            {

                // Split the line
                string[] cols = lines[i].Split(new char[] { ',' });

                // Validate the line
                if (cols[6].Trim() == string.Empty)
                    continue;

                // Append the tag line
                sb.AppendLine("\t" + cols[6].Trim() + ": Tag['" + cols[0] + "']" + ((i == lines.Length - 1) ? string.Empty : ","));

            }

            // End the Tag map
            sb.AppendLine("};");

            #endregion

            // Write out the raw javascript dictionary file
            System.IO.File.WriteAllText(System.IO.Path.Combine(rootPath, "bright-js", "src", "dicomDictionaries.js"), sb.ToString());

        }

        /*
         * Generate the language specific dictionaries from the "generic" dictionaries.
         */
        public static void generateLanguageDictionaries()
        {

            // Generate the "Javascript" dictionaries
            generateJavascriptDictionaries();

        }

        #endregion

        #region Main Entrypoint

        /**
         * Primary entry-point.
         */
        public static async Task Main(string[] args)
        {

            // Fetch the DICOM Part-06 dictionary
            XDocument? dictionary = await fetchDataDictionary();

            if (dictionary == null)
            {

                // Report to the caller
                Console.WriteLine("No DICOM Part-06 Data Dictionary!");

                return;

            }

            // Generate the latest of all "generic" (CSV) dictionaries
            generateGenericDictionaries(dictionary);

            // Generate the latest language-specific dictionaries
            generateLanguageDictionaries();

            // Return
            return;

        }

        #endregion

    }

}