<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:csc="http://omg.org/spec/CASCaRA/Metamodel" xmlns:arch="http://omg.org/spec/CASCaRA/ProductArchitecture" xmlns:mech="http://omg.org/spec/CASCaRA/MechanicalDesign" xmlns:org="http://omg.org/spec/CASCaRA/Organization" version="1">
	<xsl:output method="xml" encoding="UTF-8" indent="yes" standalone="yes"/>
	<xsl:template match="/">
		<rdf:RDF>
			<xsl:for-each select="//*[local-name()='Representation'][@xsi:*[local-name()='type']='bom:Mechanism']">
				<xsl:variable name="input">
					<xsl:value-of select="@uid"/>
				</xsl:variable>
				<!--KinematicMechanism-->
				<mech:KinematicMechanism>
					<dc:identifier>
						<xsl:value-of select="@uid"/>
					</dc:identifier>
					<dc:title>
						<xsl:value-of select="*[local-name()='Name']/*[local-name()='CharacterString']"/>
					</dc:title>
					<!--KinematicMechanism relations-->
					<xsl:for-each select=".">
						<KinematicMechanism.partOf.MechanicalComponent>
							<source>
								<xsl:value-of select="$input"/>
							</source>
							<target>
								<xsl:value-of select="."/>
							</target>
						</KinematicMechanism.partOf.MechanicalComponent>
					</xsl:for-each>
				</mech:KinematicMechanism>
			</xsl:for-each>
			<xsl:for-each select="//*[local-name()='Occurrence']">
				<xsl:variable name="input">
					<xsl:value-of select="@uid"/>
				</xsl:variable>
				<!--MechanicalComponent-->
				<mech:MechanicalComponent>
					<dc:identifier>
						<xsl:value-of select="@uid"/>
					</dc:identifier>
					<dc:title>
						<xsl:value-of select="*[local-name()='Id']/@id"/>
					</dc:title>
				</mech:MechanicalComponent>
			</xsl:for-each>
			<xsl:for-each select="//*[local-name()='Organization']">
				<xsl:variable name="input">
					<xsl:value-of select="@uid"/>
				</xsl:variable>
				<!--OrganizationUnit-->
				<org:OrganizationUnit>
					<dc:identifier>
						<xsl:value-of select="@uid"/>
					</dc:identifier>
					<dc:title>
						<xsl:value-of select="*[local-name()='Name']/*[local-name()='CharacterString']"/>
					</dc:title>
					<!--OrganizationUnit relations-->
					<xsl:for-each select=".//*[local-name()='OrganizationRelationship'][*[local-name()='RelationType']/*[local-name()='ClassString']='hierarchy']/*[local-name()='Related']/@uidRef">
						<OrganizationUnit.partOf.OrganizationUnit>
							<source>
								<xsl:value-of select="$input"/>
							</source>
							<target>
								<xsl:value-of select="."/>
							</target>
						</OrganizationUnit.partOf.OrganizationUnit>
					</xsl:for-each>
				</org:OrganizationUnit>
			</xsl:for-each>
			<xsl:for-each select="//*[local-name()='Part']">
				<xsl:variable name="input">
					<xsl:value-of select="@uid"/>
				</xsl:variable>
				<!--MechanicalComponent-->
				<mech:MechanicalComponent>
					<dc:identifier>
						<xsl:value-of select="@uid"/>
					</dc:identifier>
					<dc:title>
						<xsl:value-of select="*[local-name()='Id']/*[local-name()='Identifier']/@id"/>
					</dc:title>
					<mass>
						<xsl:value-of select="*[local-name()='Versions']/*[local-name()='PartVersion']/*[local-name()='Views']/*[local-name()='PartView']/*[local-name()='PropertyValueAssignment']/*[local-name()='AssignedPropertyValues']/*[local-name()='PropertyValue'][./@uid='PRV--26']/*[local-name()='ValueComponent']/*[local-name()='CharacterString']"/>
					</mass>
					<!--MechanicalComponent relations-->
					<xsl:for-each select=".//*[local-name()='ViewOccurrenceRelationship']/*[local-name()='Related']/@uidRef">
						<SystemComponent.partOf.SystemComponent>
							<source>
								<xsl:value-of select="$input"/>
							</source>
							<target>
								<xsl:value-of select="."/>
							</target>
						</SystemComponent.partOf.SystemComponent>
					</xsl:for-each>
					<!--MechanicalComponent relations-->
					<xsl:for-each select=".//*[local-name()='Occurrence']/@uid">
						<SystemComponent.usedIn.SystemComponent>
							<source>
								<xsl:value-of select="$input"/>
							</source>
							<target>
								<xsl:value-of select="."/>
							</target>
						</SystemComponent.usedIn.SystemComponent>
					</xsl:for-each>
				</mech:MechanicalComponent>
			</xsl:for-each>
			<xsl:for-each select="//*[local-name()='Project']">
				<xsl:variable name="input">
					<xsl:value-of select="@uid"/>
				</xsl:variable>
				<!--Project-->
				<org:Project>
					<dc:identifier>
						<xsl:value-of select="@uid"/>
					</dc:identifier>
					<number>
						<xsl:value-of select="*[local-name()='Id']/@id"/>
					</number>
					<dc:title>
						<xsl:value-of select="*[local-name()='Name']/*[local-name()='CharacterString']"/>
					</dc:title>
					<!--Project relations-->
					<xsl:for-each select=".//*[local-name()='ResponsibleOrganizations']/*[local-name()='Organization']/@uidRef">
						<Event.ownedBy.Actor>
							<source>
								<xsl:value-of select="$input"/>
							</source>
							<target>
								<xsl:value-of select="."/>
							</target>
						</Event.ownedBy.Actor>
					</xsl:for-each>
				</org:Project>
			</xsl:for-each>
			<xsl:for-each select="//*[local-name()='Requirement']">
				<xsl:variable name="input">
					<xsl:value-of select="@uid"/>
				</xsl:variable>
				<!--Requirement-->
				<arch:Requirement>
					<dc:identifier>
						<xsl:value-of select="@uid"/>
					</dc:identifier>
					<number>
						<xsl:value-of select="*[local-name()='Id']/*[local-name()='Identifier']/@id"/>
					</number>
					<dc:description>
						<xsl:value-of select="*[local-name()='Name']/*[local-name()='CharacterString']"/>
					</dc:description>
				</arch:Requirement>
			</xsl:for-each>
		</rdf:RDF>
	</xsl:template>
</xsl:stylesheet>