<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:csc="http://omg.org/CASCaRa/cas/" version="2">
	<xsl:output method="xml" encoding="UTF-8" indent="yes" standalone="yes"/>
	<xsl:template match="/">
		<rdf:RDF>
			<xsl:for-each select="//*[local-name()='SPEC-OBJECT']">
				<xsl:variable name="input">
					<xsl:value-of select="@IDENTIFIER"/>
				</xsl:variable>
				<!--Requirement-->
				<Requirement>
					<dc:identifier>
						<xsl:value-of select="@IDENTIFIER"/>
					</dc:identifier>
					<number>
						<xsl:value-of select="*[local-name()='VALUES']/*[./*[local-name()='DEFINITION']/*[starts-with(local-name(),'ATTRIBUTE-DEFINITION')]=//*[local-name()='SPEC-OBJECT-TYPE']/*[local-name()='SPEC-ATTRIBUTES']/*[@LONG-NAME='ReqIF.ForeignID']/@IDENTIFIER]/@THE-VALUE"/>
					</number>
					<dc:title>
						<xsl:value-of select="*[local-name()='VALUES']/*[./*[local-name()='DEFINITION']/*[starts-with(local-name(),'ATTRIBUTE-DEFINITION')]=//*[local-name()='SPEC-OBJECT-TYPE']/*[local-name()='SPEC-ATTRIBUTES']/*[@LONG-NAME='ReqIF.Name' or @LONG-NAME='ReqIF.ChapterName']/@IDENTIFIER]/*[local-name()='THE-VALUE']"/>
					</dc:title>
					<dc:description>
						<xsl:value-of select="*[local-name()='VALUES']/*[./*[local-name()='DEFINITION']/*[starts-with(local-name(),'ATTRIBUTE-DEFINITION')]=//*[local-name()='SPEC-OBJECT-TYPE']/*[local-name()='SPEC-ATTRIBUTES']/*[@LONG-NAME='ReqIF.Text']/@IDENTIFIER]/*[local-name()='THE-VALUE']"/>
					</dc:description>
					<!--Requirement relations-->
					<xsl:for-each select="//*[local-name()='SPEC-HIERARCHY'][./*[local-name()='OBJECT']/*[local-name()='SPEC-OBJECT-REF']=$input]/*[local-name()='CHILDREN']/*[local-name()='SPEC-HIERARCHY']/*[local-name()='OBJECT']/*[local-name()='SPEC-OBJECT-REF']">
						<Requirement.partOf.Requirement>
							<source>
								<xsl:value-of select="$input"/>
							</source>
							<target>
								<xsl:value-of select="."/>
							</target>
						</Requirement.partOf.Requirement>
					</xsl:for-each>
				</Requirement>
			</xsl:for-each>
		</rdf:RDF>
	</xsl:template>
</xsl:stylesheet>