import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	fullPageContainer: {
		flex: 1,
	},
	fullPageHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 12,
		borderBottomWidth: 1,
	},
	backButton: {
		width: 32,
		height: 32,
		alignItems: 'center',
		justifyContent: 'center',
	},
	fullPageTitle: {
		fontSize: 20,
		fontWeight: '700',
	},
	fullPageList: {
		padding: 16,
		paddingBottom: 40,
		gap: 12,
	},
	loadMoreHint: {
		textAlign: 'center',
		marginTop: 8,
		fontSize: 12,
		fontWeight: '500',
	},
	header: {
		marginBottom: 24,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: 'bold',
		marginBottom: 4,
	},
	headerSubtitle: {
		fontSize: 14,
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1,
		marginBottom: 12,
	},
	actionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginBottom: 24,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		borderWidth: 1,
	},
	filterActionButton: {
		marginLeft: 0,
	},
	actionButtonText: {
		color: '#a94a5c',
		marginLeft: 6,
		fontWeight: '600',
	},
	categorySection: {
		marginBottom: 32,
	},
	categoryHeader: {
		marginBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	categoryTitle: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	categoryName: {
		fontSize: 18,
		fontWeight: '600',
	},
	loadingContainer: {
		paddingVertical: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyState: {
		paddingVertical: 24,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 8,
	},
	poiScroll: {
		marginHorizontal: -16,
	},
	poiScrollContent: {
		paddingHorizontal: 16,
	},
	poiCard: {
		width: 240,
		marginRight: 12,
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
	},
	poiCardVertical: {
		width: '100%',
		marginRight: 0,
		marginBottom: 12,
	},
	cardHeader: {
		marginBottom: 12,
		flexDirection: 'row',
	},
	poiName: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 4,
	},
	poiAddress: {
		fontSize: 12,
	},
	cardFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	distance: {
		fontSize: 14,
		fontWeight: 'bold',
		marginBottom: 2,
	},
	status: {
		fontSize: 12,
		fontWeight: '500',
	},
	directionsButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#a94a5c',
		paddingVertical: 8,
		borderRadius: 6,
		gap: 6,
	},
	directionsText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '600',
	},
	seeAllText: {
		color: '#a94a5c',
		fontSize: 13,
		fontWeight: '700',
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'flex-end',
	},
	filterModal: {
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		borderWidth: 1,
		borderBottomWidth: 0,
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 30,
	},
	filterHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	filterTitle: {
		fontSize: 20,
		fontWeight: '700',
	},
	filterSectionLabel: {
		fontSize: 14,
		fontWeight: '700',
		marginBottom: 10,
		marginTop: 8,
	},
	filterChipWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	filterChip: {
		borderWidth: 1,
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	filterFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 22,
	},
	clearButton: {
		borderWidth: 1,
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 16,
	},
	applyButton: {
		backgroundColor: '#a94a5c',
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 20,
	},
	applyButtonText: {
		color: '#ffffff',
		fontWeight: '700',
	},
	radiusInlineRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 6,
	},
	radiusSliderWrap: {
		flex: 1,
		marginRight: 8,
	},
	radiusInlineInput: {
		minWidth: 38,
		fontWeight: '600',
		fontSize: 14,
		textAlign: 'right',
		paddingVertical: 0,
	},
	radiusInlineUnit: {
		marginLeft: 4,
		fontWeight: '600',
		fontSize: 14,
	},
});
