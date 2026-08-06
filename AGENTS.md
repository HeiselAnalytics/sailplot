# SailPlot architecture rules

- All SailPlot features are implemented only in this repository.
- Consumer projects may add only configuration, branding, pages, navigation and integrations.
- Do not add customer-specific names, domains, logos or prices to the public core.
- The standalone application and the package use the same components and feature logic.
- Every change must validate both the standalone build and the package build.
- The default configuration must keep the public SailPlot application fully functional.
